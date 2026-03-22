"""JobService — CRUD for jobs (tenant-scoped)."""
import re
import secrets
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.helpers.pg_search import ilike_contains, job_search_predicate, normalize_q, trigram_match
from app.models.application import Application
from app.models.job import Job
from app.models.job_attachment import JobAttachment
from app.models.job_version import JobVersion
from app.helpers.logger import get_logger
from app.helpers.scorecard_criteria import normalize_job_criteria
from app.services.base_service import BaseService
from app.services.custom_attribute_service import CustomAttributeService, ENTITY_JOB
from app.services.label_service import LABELABLE_JOB, LabelService

logger = get_logger(__name__)


def _job_dict_with_labels(db: Session, account_id: int, job: Job) -> dict:
    d = job.to_dict()
    d["labels"] = LabelService(db).labels_payload_for_entity(account_id, LABELABLE_JOB, job.id)
    return d


def _slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def _parse_open_positions(raw: Any) -> int:
    if raw is None:
        return 1
    try:
        return max(1, int(raw))
    except (TypeError, ValueError):
        return 1


def _coerce_job_config(raw: Any) -> dict:
    if isinstance(raw, dict):
        return raw
    return {}


def _next_attachment_id(db: Session) -> int:
    mx = db.scalar(select(func.coalesce(func.max(JobAttachment.id), 0)))
    return int(mx or 0) + 1


def _new_apply_token() -> str:
    return secrets.token_urlsafe(32)


class JobService(BaseService):
    def list_jobs(
        self,
        account_id: int,
        status: str | None = None,
        q: str | None = None,
        department: str | None = None,
        location: str | None = None,
    ) -> dict:
        stmt = select(Job).where(Job.account_id == account_id, Job.deleted_at == None)
        if status:
            stmt = stmt.where(Job.status == status)
        nq = normalize_q(q)
        if nq:
            stmt = stmt.where(job_search_predicate(Job, JobVersion, q=nq, account_id=account_id))
        nd = normalize_q(department)
        if nd:
            stmt = stmt.where(
                Job.department.isnot(None),
                or_(
                    trigram_match(Job.department, nd, param_name="job_dept_trgm"),
                    ilike_contains(Job.department, nd, param_name="job_dept_ilike"),
                ),
            )
        nl = normalize_q(location)
        if nl:
            stmt = stmt.where(
                Job.location.isnot(None),
                or_(
                    trigram_match(Job.location, nl, param_name="job_loc_trgm"),
                    ilike_contains(Job.location, nl, param_name="job_loc_ilike"),
                ),
            )
        stmt = stmt.order_by(Job.created_at.desc())
        jobs = list(self.db.execute(stmt).scalars().all())
        logger.info(f"JobService.list_jobs — account={account_id} count={len(jobs)}")
        ids = [j.id for j in jobs]
        lbl_map = LabelService.labels_map_for_entities(self.db, account_id, LABELABLE_JOB, ids)
        out = [{**j.to_dict(), "labels": lbl_map.get(j.id, [])} for j in jobs]
        return self.success(out)

    def get_job(self, account_id: int, job_id: int) -> dict:
        job = Job.find_by(self.db, id=job_id, account_id=account_id)
        if not job or job.deleted_at:
            return self.failure("Job not found")
        # Include versions
        versions = JobVersion.where(self.db, job_id=job_id)
        data = _job_dict_with_labels(self.db, account_id, job)
        data["versions"] = [v.to_dict() for v in versions]
        atts = JobAttachment.where(self.db, job_id=job_id, account_id=account_id)
        data["attachments"] = [a.to_dict() for a in atts]
        return self.success(data)

    def create_job(self, account_id: int, user_id: int, data: dict) -> dict:
        cas = CustomAttributeService(self.db)
        merged_cf, err = cas.merge_validated(
            account_id, ENTITY_JOB, data.get("custom_fields"), {}, full_required_check=True
        )
        if err:
            return self.failure(err)
        data = {**data, "custom_fields": merged_cf}
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
            apply_token=_new_apply_token(),
            department=data.get("department"),
            location=data.get("location"),
            location_type=data.get("location_type", "onsite"),
            employment_type=data.get("employment_type", "full_time"),
            experience_level=data.get("experience_level"),
            open_positions=_parse_open_positions(data.get("open_positions")),
            bonus_incentives=data.get("bonus_incentives"),
            budget_approval_status=data.get("budget_approval_status"),
            cost_center=data.get("cost_center"),
            hiring_budget_id=data.get("hiring_budget_id"),
            hiring_manager_user_id=data.get("hiring_manager_user_id"),
            recruiter_user_id=data.get("recruiter_user_id"),
            requisition_id=data.get("requisition_id"),
            job_config=_coerce_job_config(data.get("job_config")),
            salary_min=data.get("salary_min"),
            salary_max=data.get("salary_max"),
            salary_currency=data.get("salary_currency", "USD"),
            salary_visible=data.get("salary_visible", True),
            status=data.get("status", "draft"),
            video_embed_url=data.get("video_embed_url"),
            seo_metadata=data.get("seo_metadata", {}),
            custom_fields=data.get("custom_fields", {}),
            tags=data.get("tags", []),
            scorecard_criteria=normalize_job_criteria(data.get("scorecard_criteria")),
            created_at=now, updated_at=now,
        )
        job.save(self.db)
        # Auto-create version A if description provided
        description = data.get("description", "")
        if description:
            self._create_version(job.id, account_id, user_id, "A", description, data, is_control=True)
        logger.info(f"JobService.create_job — created id={job.id} title={job.title}")
        return self.success(_job_dict_with_labels(self.db, account_id, job))

    def update_job(self, account_id: int, job_id: int, data: dict) -> dict:
        job = Job.find_by(self.db, id=job_id, account_id=account_id)
        if not job or job.deleted_at:
            return self.failure("Job not found")
        if "custom_fields" in data:
            cas = CustomAttributeService(self.db)
            merged_cf, err = cas.merge_validated(
                account_id,
                ENTITY_JOB,
                data.get("custom_fields"),
                job.custom_fields if isinstance(job.custom_fields, dict) else {},
                full_required_check=True,
            )
            if err:
                return self.failure(err)
            data = {**data, "custom_fields": merged_cf}
        allowed = [
            "title", "department", "location", "location_type", "employment_type",
            "experience_level", "open_positions", "bonus_incentives", "budget_approval_status",
            "cost_center", "hiring_budget_id", "hiring_manager_user_id", "recruiter_user_id",
            "requisition_id", "job_config",
            "salary_min", "salary_max", "salary_currency",
            "salary_visible", "status", "video_embed_url", "seo_metadata",
            "custom_fields", "tags", "closes_at", "scorecard_criteria",
        ]
        for k in allowed:
            if k in data:
                if k == "scorecard_criteria":
                    job.scorecard_criteria = normalize_job_criteria(data[k])
                elif k == "job_config":
                    job.job_config = _coerce_job_config(data[k])
                elif k == "open_positions":
                    job.open_positions = _parse_open_positions(data[k])
                elif k in ("hiring_manager_user_id", "recruiter_user_id"):
                    v = data[k]
                    setattr(job, k, int(v) if v is not None and v != "" else None)
                else:
                    setattr(job, k, data[k])
        if data.get("status") == "open" and not job.published_at:
            job.published_at = datetime.now(timezone.utc)
        if not getattr(job, "apply_token", None):
            job.apply_token = _new_apply_token()
        job.updated_at = datetime.now(timezone.utc)
        job.save(self.db)
        logger.info(f"JobService.update_job — updated id={job_id}")
        return self.success(_job_dict_with_labels(self.db, account_id, job))

    def delete_job(self, account_id: int, job_id: int) -> dict:
        job = Job.find_by(self.db, id=job_id, account_id=account_id)
        if not job or job.deleted_at:
            return self.failure("Job not found")
        job.deleted_at = datetime.now(timezone.utc)
        job.save(self.db)
        logger.info(f"JobService.delete_job — soft-deleted id={job_id}")
        return self.success({"deleted": True})

    # ── Analytics (read-only aggregates) ──────────────────────────

    def job_analytics(self, account_id: int, job_id: int) -> dict:
        job = Job.find_by(self.db, id=job_id, account_id=account_id)
        if not job or job.deleted_at:
            return self.failure("Job not found")
        total = self.db.scalar(
            select(func.count(Application.id)).where(
                Application.account_id == account_id,
                Application.job_id == job_id,
                Application.deleted_at == None,
            )
        ) or 0
        by_status_rows = self.db.execute(
            select(Application.status, func.count(Application.id))
            .where(
                Application.account_id == account_id,
                Application.job_id == job_id,
                Application.deleted_at == None,
            )
            .group_by(Application.status)
        ).all()
        by_source_rows = self.db.execute(
            select(Application.source_type, func.count(Application.id))
            .where(
                Application.account_id == account_id,
                Application.job_id == job_id,
                Application.deleted_at == None,
            )
            .group_by(Application.source_type)
        ).all()
        hired = sum(c for s, c in by_status_rows if s == "hired")
        offered = sum(c for s, c in by_status_rows if s == "offer")
        rejected = sum(c for s, c in by_status_rows if s in ("rejected", "withdrawn"))
        return self.success(
            {
                "total_applicants": int(total),
                "by_status": {str(s): int(c) for s, c in by_status_rows},
                "by_source": {str(s): int(c) for s, c in by_source_rows},
                "hired_count": int(hired),
                "offer_stage_count": int(offered),
                "rejected_or_withdrawn": int(rejected),
                "offer_acceptance_rate": (hired / offered) if offered else None,
            }
        )

    # ── Attachments ───────────────────────────────────────────────

    def list_attachments(self, account_id: int, job_id: int) -> dict:
        job = Job.find_by(self.db, id=job_id, account_id=account_id)
        if not job or job.deleted_at:
            return self.failure("Job not found")
        rows = JobAttachment.where(self.db, job_id=job_id, account_id=account_id)
        rows.sort(key=lambda a: a.id)
        return self.success([r.to_dict() for r in rows])

    def create_attachment(self, account_id: int, job_id: int, data: dict) -> dict:
        job = Job.find_by(self.db, id=job_id, account_id=account_id)
        if not job or job.deleted_at:
            return self.failure("Job not found")
        name = (data.get("name") or "").strip()
        file_url = (data.get("file_url") or "").strip()
        if not name or not file_url:
            return self.failure("name and file_url are required")
        now = datetime.now(timezone.utc)
        att = JobAttachment(
            id=_next_attachment_id(self.db),
            account_id=account_id,
            job_id=job_id,
            name=name,
            doc_type=data.get("doc_type"),
            file_url=file_url,
            created_at=now,
            updated_at=now,
        )
        att.save(self.db)
        return self.success(att.to_dict())

    def delete_attachment(self, account_id: int, job_id: int, attachment_id: int) -> dict:
        job = Job.find_by(self.db, id=job_id, account_id=account_id)
        if not job or job.deleted_at:
            return self.failure("Job not found")
        att = JobAttachment.find_by(self.db, id=attachment_id, job_id=job_id, account_id=account_id)
        if not att:
            return self.failure("Attachment not found")
        att.destroy(self.db)
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

    def update_version(
        self, account_id: int, job_id: int, version_id: int, data: dict
    ) -> dict:
        job = Job.find_by(self.db, id=job_id, account_id=account_id)
        if not job or job.deleted_at:
            return self.failure("Job not found")
        v = JobVersion.find_by(
            self.db, id=version_id, job_id=job_id, account_id=account_id
        )
        if not v:
            return self.failure("Version not found")
        if "description" in data and data["description"] is not None:
            v.description = data["description"]
        if "requirements" in data:
            v.requirements = data["requirements"]
        if "benefits" in data:
            v.benefits = data["benefits"]
        if "title_override" in data:
            v.title_override = data["title_override"]
        if "call_to_action" in data:
            v.call_to_action = data["call_to_action"]
        if "traffic_weight" in data and data["traffic_weight"] is not None:
            v.traffic_weight = int(data["traffic_weight"])
        if "is_active" in data and data["is_active"] is not None:
            v.is_active = bool(data["is_active"])
        if "is_control" in data and data["is_control"] is not None:
            v.is_control = bool(data["is_control"])
        v.updated_at = datetime.now(timezone.utc)
        v.save(self.db)
        logger.info(f"JobService.update_version — job={job_id} version={version_id}")
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
