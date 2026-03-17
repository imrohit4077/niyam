"""ApplicationService — candidate applications CRUD + stage management."""
from datetime import datetime, timezone
from sqlalchemy import select
from app.models.application import Application
from app.models.job import Job
from app.helpers.logger import get_logger
from app.services.base_service import BaseService

logger = get_logger(__name__)


class ApplicationService(BaseService):
    def list_applications(self, account_id: int, job_id: int | None = None,
                          status: str | None = None) -> dict:
        stmt = select(Application).where(
            Application.account_id == account_id,
            Application.deleted_at == None,
        )
        if job_id:
            stmt = stmt.where(Application.job_id == job_id)
        if status:
            stmt = stmt.where(Application.status == status)
        stmt = stmt.order_by(Application.created_at.desc())
        apps = list(self.db.execute(stmt).scalars().all())
        return self.success([a.to_dict() for a in apps])

    def get_application(self, account_id: int, app_id: int) -> dict:
        app = Application.find_by(self.db, id=app_id, account_id=account_id)
        if not app or app.deleted_at:
            return self.failure("Application not found")
        return self.success(app.to_dict())

    def create_application(self, account_id: int, data: dict) -> dict:
        job_id = data.get("job_id")
        email = (data.get("candidate_email") or "").strip().lower()
        if not job_id or not email:
            return self.failure("job_id and candidate_email are required")
        job = Job.find_by(self.db, id=job_id, account_id=account_id)
        if not job or job.deleted_at:
            return self.failure("Job not found")
        existing = Application.find_by(self.db, job_id=job_id, candidate_email=email)
        if existing and not existing.deleted_at:
            return self.failure("Candidate already applied to this job")
        now = datetime.now(timezone.utc)
        app = Application(
            account_id=account_id, job_id=job_id,
            candidate_id=data.get("candidate_id"),
            source_board_id=data.get("source_board_id"),
            source_version_id=data.get("source_version_id"),
            source_posting_id=data.get("source_posting_id"),
            source_type=data.get("source_type", "direct"),
            candidate_name=data.get("candidate_name"),
            candidate_email=email,
            candidate_phone=data.get("candidate_phone"),
            candidate_location=data.get("candidate_location"),
            resume_url=data.get("resume_url"),
            cover_letter=data.get("cover_letter"),
            linkedin_url=data.get("linkedin_url"),
            portfolio_url=data.get("portfolio_url"),
            custom_answers=data.get("custom_answers", {}),
            status="applied",
            stage_history=[{"stage": "applied", "changed_at": now.isoformat()}],
            tags=data.get("tags", []),
            created_at=now, updated_at=now,
        )
        app.save(self.db)
        logger.info(f"ApplicationService.create — id={app.id} job={job_id} email={email}")
        return self.success(app.to_dict())

    def update_stage(self, account_id: int, app_id: int, user_id: int, status: str,
                     reason: str | None = None) -> dict:
        app = Application.find_by(self.db, id=app_id, account_id=account_id)
        if not app or app.deleted_at:
            return self.failure("Application not found")
        valid = {"applied", "screening", "interview", "offer", "hired", "rejected", "withdrawn"}
        if status not in valid:
            return self.failure(f"Invalid status. Must be one of: {', '.join(valid)}")
        now = datetime.now(timezone.utc)
        history = list(app.stage_history or [])
        history.append({"stage": status, "changed_by": user_id, "changed_at": now.isoformat()})
        app.status = status
        app.stage_history = history
        if status == "rejected" and reason:
            app.rejection_reason = reason
        app.updated_at = now
        app.save(self.db)
        logger.info(f"ApplicationService.update_stage — id={app_id} status={status}")
        return self.success(app.to_dict())

    def delete_application(self, account_id: int, app_id: int) -> dict:
        app = Application.find_by(self.db, id=app_id, account_id=account_id)
        if not app or app.deleted_at:
            return self.failure("Application not found")
        app.deleted_at = datetime.now(timezone.utc)
        app.save(self.db)
        return self.success({"deleted": True})
