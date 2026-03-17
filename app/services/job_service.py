"""JobService — CRUD for jobs (tenant-scoped)."""
import re
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.job import Job
from app.models.job_version import JobVersion
from app.helpers.logger import get_logger
from app.services.base_service import BaseService

logger = get_logger(__name__)


def _slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


class JobService(BaseService):
    def list_jobs(self, account_id: int, status: str | None = None) -> dict:
        stmt = select(Job).where(Job.account_id == account_id, Job.deleted_at == None)
        if status:
            stmt = stmt.where(Job.status == status)
        stmt = stmt.order_by(Job.created_at.desc())
        jobs = list(self.db.execute(stmt).scalars().all())
        logger.info(f"JobService.list_jobs — account={account_id} count={len(jobs)}")
        return self.success([j.to_dict() for j in jobs])

    def get_job(self, account_id: int, job_id: int) -> dict:
        job = Job.find_by(self.db, id=job_id, account_id=account_id)
        if not job or job.deleted_at:
            return self.failure("Job not found")
        # Include versions
        versions = JobVersion.where(self.db, job_id=job_id)
        data = job.to_dict()
        data["versions"] = [v.to_dict() for v in versions]
        return self.success(data)

    def create_job(self, account_id: int, user_id: int, data: dict) -> dict:
        title = (data.get("title") or "").strip()
        if not title:
            return self.failure("title is required")
        slug = _slugify(title)
        # Ensure unique slug within account
        existing = Job.find_by(self.db, account_id=account_id, slug=slug)
        if existing:
            slug = f"{slug}-{int(datetime.now().timestamp())}"
        now = datetime.now(timezone.utc)
        job = Job(
            account_id=account_id, created_by=user_id,
            title=title, slug=slug,
            department=data.get("department"),
            location=data.get("location"),
            location_type=data.get("location_type", "onsite"),
            employment_type=data.get("employment_type", "full_time"),
            experience_level=data.get("experience_level"),
            salary_min=data.get("salary_min"),
            salary_max=data.get("salary_max"),
            salary_currency=data.get("salary_currency", "USD"),
            salary_visible=data.get("salary_visible", True),
            status=data.get("status", "draft"),
            video_embed_url=data.get("video_embed_url"),
            seo_metadata=data.get("seo_metadata", {}),
            custom_fields=data.get("custom_fields", {}),
            tags=data.get("tags", []),
            created_at=now, updated_at=now,
        )
        job.save(self.db)
        # Auto-create version A if description provided
        description = data.get("description", "")
        if description:
            self._create_version(job.id, account_id, user_id, "A", description, data, is_control=True)
        logger.info(f"JobService.create_job — created id={job.id} title={job.title}")
        return self.success(job.to_dict())

    def update_job(self, account_id: int, job_id: int, data: dict) -> dict:
        job = Job.find_by(self.db, id=job_id, account_id=account_id)
        if not job or job.deleted_at:
            return self.failure("Job not found")
        allowed = ["title", "department", "location", "location_type", "employment_type",
                   "experience_level", "salary_min", "salary_max", "salary_currency",
                   "salary_visible", "status", "video_embed_url", "seo_metadata",
                   "custom_fields", "tags", "closes_at"]
        for k in allowed:
            if k in data:
                setattr(job, k, data[k])
        if data.get("status") == "open" and not job.published_at:
            job.published_at = datetime.now(timezone.utc)
        job.updated_at = datetime.now(timezone.utc)
        job.save(self.db)
        logger.info(f"JobService.update_job — updated id={job_id}")
        return self.success(job.to_dict())

    def delete_job(self, account_id: int, job_id: int) -> dict:
        job = Job.find_by(self.db, id=job_id, account_id=account_id)
        if not job or job.deleted_at:
            return self.failure("Job not found")
        job.deleted_at = datetime.now(timezone.utc)
        job.save(self.db)
        logger.info(f"JobService.delete_job — soft-deleted id={job_id}")
        return self.success({"deleted": True})

    # ── Versions ──────────────────────────────────────────────────

    def list_versions(self, account_id: int, job_id: int) -> dict:
        job = Job.find_by(self.db, id=job_id, account_id=account_id)
        if not job:
            return self.failure("Job not found")
        versions = JobVersion.where(self.db, job_id=job_id)
        return self.success([v.to_dict() for v in versions])

    def create_version(self, account_id: int, job_id: int, user_id: int, data: dict) -> dict:
        job = Job.find_by(self.db, id=job_id, account_id=account_id)
        if not job:
            return self.failure("Job not found")
        name = (data.get("version_name") or "").strip()
        if not name:
            return self.failure("version_name is required")
        description = (data.get("description") or "").strip()
        if not description:
            return self.failure("description is required")
        existing = JobVersion.find_by(self.db, job_id=job_id, version_name=name)
        if existing:
            return self.failure(f"Version '{name}' already exists for this job")
        v = self._create_version(job_id, account_id, user_id, name, description, data)
        return self.success(v.to_dict())

    def _create_version(self, job_id, account_id, user_id, name, description, data, is_control=False):
        now = datetime.now(timezone.utc)
        # Count existing versions for version_number
        existing = JobVersion.where(self.db, job_id=job_id)
        v = JobVersion(
            job_id=job_id, account_id=account_id, created_by=user_id,
            version_name=name, version_number=len(existing) + 1,
            title_override=data.get("title_override"),
            description=description,
            requirements=data.get("requirements"),
            benefits=data.get("benefits"),
            call_to_action=data.get("call_to_action", "Apply Now"),
            is_active=True, is_control=is_control,
            traffic_weight=data.get("traffic_weight", 50),
            created_at=now, updated_at=now,
        )
        v.save(self.db)
        return v
