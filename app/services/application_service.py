"""ApplicationService — candidate applications CRUD + stage management."""
from datetime import datetime, timezone
from sqlalchemy import select
from app.models.application import Application
from app.models.job import Job
from app.models.pipeline_stage import PipelineStage
from app.helpers.logger import get_logger
from app.services.base_service import BaseService

logger = get_logger(__name__)

_STAGES_FROM_TYPE = {
    "applied": "applied",
    "screening": "screening",
    "interview": "interview",
    "offer": "offer",
    "hired": "hired",
    "rejected": "rejected",
    "withdrawn": "withdrawn",
}


def _enqueue_hiring_plan_refresh(account_id: int, job_id: int) -> None:
    try:
        from app.jobs.refresh_hiring_plan_hires_job import refresh_hiring_plan_hires_made

        refresh_hiring_plan_hires_made.delay(account_id=account_id, job_id=job_id)
    except Exception:
        logger.warning(
            "Could not enqueue hiring plan hires refresh",
            exc_info=True,
            extra={"account_id": account_id, "job_id": job_id},
        )


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

    def update_stage(
        self,
        account_id: int,
        app_id: int,
        user_id: int,
        status: str | None = None,
        reason: str | None = None,
        pipeline_stage_id: int | None = None,
        *,
        pipeline_touch: bool = False,
        status_touch: bool = False,
    ) -> dict:
        app = Application.find_by(self.db, id=app_id, account_id=account_id)
        if not app or app.deleted_at:
            return self.failure("Application not found")
        if not status_touch and not pipeline_touch:
            return self.failure("Provide status and/or pipeline_stage_id")

        valid = {"applied", "screening", "interview", "offer", "hired", "rejected", "withdrawn"}
        old_status = app.status
        derived_from_stage: str | None = None

        if pipeline_touch:
            if pipeline_stage_id is None:
                app.pipeline_stage_id = None
            else:
                stage = PipelineStage.find_by(
                    self.db,
                    id=pipeline_stage_id,
                    account_id=account_id,
                    job_id=app.job_id,
                )
                if not stage:
                    return self.failure("Pipeline stage not found for this job")
                app.pipeline_stage_id = pipeline_stage_id
                if stage.stage_type and stage.stage_type in _STAGES_FROM_TYPE:
                    derived_from_stage = _STAGES_FROM_TYPE[stage.stage_type]

        effective_status: str | None = None
        if status_touch:
            if not status:
                return self.failure("status cannot be empty when provided")
            if status not in valid:
                return self.failure(f"Invalid status. Must be one of: {', '.join(sorted(valid))}")
            effective_status = status
        elif derived_from_stage is not None:
            effective_status = derived_from_stage

        if effective_status is not None:
            app.status = effective_status

        now = datetime.now(timezone.utc)
        history = list(app.stage_history or [])
        history.append(
            {
                "stage": app.status,
                "pipeline_stage_id": app.pipeline_stage_id,
                "changed_by": user_id,
                "changed_at": now.isoformat(),
            }
        )
        app.stage_history = history
        if app.status == "rejected" and reason:
            app.rejection_reason = reason
        app.updated_at = now
        app.save(self.db)

        if old_status != app.status and (app.status == "hired" or old_status == "hired"):
            _enqueue_hiring_plan_refresh(account_id, app.job_id)

        logger.info(
            f"ApplicationService.update_stage — id={app_id} status={app.status} "
            f"pipeline_stage_id={app.pipeline_stage_id}"
        )
        return self.success(app.to_dict())

    def delete_application(self, account_id: int, app_id: int) -> dict:
        app = Application.find_by(self.db, id=app_id, account_id=account_id)
        if not app or app.deleted_at:
            return self.failure("Application not found")
        was_hired = app.status == "hired"
        app.deleted_at = datetime.now(timezone.utc)
        app.save(self.db)
        if was_hired:
            _enqueue_hiring_plan_refresh(account_id, app.job_id)
        return self.success({"deleted": True})
