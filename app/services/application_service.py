"""ApplicationService — candidate applications CRUD + stage management."""
from datetime import datetime, timezone
from sqlalchemy import select

from app.helpers.pg_search import application_search_predicate, normalize_q
from app.models.application import Application
from app.models.job import Job
from app.models.pipeline_stage import PipelineStage
from app.helpers.logger import get_logger
from app.services.base_service import BaseService
from app.services.custom_attribute_service import CustomAttributeService, ENTITY_APPLICATION
from app.services.label_service import LABELABLE_APPLICATION, LabelService

logger = get_logger(__name__)


def _application_dict_with_labels(db, account_id: int, app: Application) -> dict:
    d = app.to_dict()
    d["labels"] = LabelService(db).labels_payload_for_entity(
        account_id, LABELABLE_APPLICATION, app.id
    )
    return d


_STAGES_FROM_TYPE = {
    "applied": "applied",
    "screening": "screening",
    "interview": "interview",
    "offer": "offer",
    "hired": "hired",
    "rejected": "rejected",
    "withdrawn": "withdrawn",
}


def _first_column_matching_stage_type(db, account_id: int, job_id: int, stage_type: str) -> PipelineStage | None:
    """First pipeline column for this job whose stage_type matches (e.g. offer → offer letter rules)."""
    stmt = (
        select(PipelineStage)
        .where(
            PipelineStage.account_id == account_id,
            PipelineStage.job_id == job_id,
            PipelineStage.stage_type == stage_type,
        )
        .order_by(PipelineStage.position.asc())
    )
    return db.execute(stmt).scalars().first()


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


def _enqueue_esign_stage_transition(
    db,
    account_id: int,
    application_id: int,
    old_pipeline_stage_id: int | None,
    new_pipeline_stage_id: int | None,
) -> None:
    if new_pipeline_stage_id is None or old_pipeline_stage_id == new_pipeline_stage_id:
        return
    try:
        from app.jobs.esign_stage_trigger_job import esign_on_stage_transition

        esign_on_stage_transition.delay(
            account_id=account_id,
            application_id=application_id,
            new_pipeline_stage_id=new_pipeline_stage_id,
        )
    except Exception:
        logger.warning(
            "Could not enqueue e-sign stage transition (running inline if broker unavailable)",
            exc_info=True,
            extra={
                "account_id": account_id,
                "application_id": application_id,
                "new_pipeline_stage_id": new_pipeline_stage_id,
            },
        )
        try:
            from app.services.esign_automation_service import EsignAutomationService

            EsignAutomationService(db).handle_stage_transition(
                account_id,
                application_id,
                new_pipeline_stage_id,
            )
        except Exception:
            logger.exception(
                "E-sign stage transition inline fallback failed",
                extra={"application_id": application_id},
            )


class ApplicationService(BaseService):
    def list_applications(
        self,
        account_id: int,
        job_id: int | None = None,
        status: str | None = None,
        q: str | None = None,
        source_type: str | None = None,
    ) -> dict:
        stmt = select(Application).where(
            Application.account_id == account_id,
            Application.deleted_at == None,
        )
        if job_id:
            stmt = stmt.where(Application.job_id == job_id)
        if status:
            stmt = stmt.where(Application.status == status)
        if source_type:
            stmt = stmt.where(Application.source_type == source_type)
        nq = normalize_q(q)
        if nq:
            stmt = (
                stmt.join(Job, Job.id == Application.job_id)
                .where(
                    Job.account_id == account_id,
                    Job.deleted_at == None,
                    application_search_predicate(Application, Job, q=nq),
                )
            )
        stmt = stmt.order_by(Application.created_at.desc())
        apps = list(self.db.execute(stmt).scalars().all())
        ids = [a.id for a in apps]
        lbl_map = LabelService.labels_map_for_entities(self.db, account_id, LABELABLE_APPLICATION, ids)
        out = [{**a.to_dict(), "labels": lbl_map.get(a.id, [])} for a in apps]
        return self.success(out)

    def get_application(self, account_id: int, app_id: int) -> dict:
        app = Application.find_by(self.db, id=app_id, account_id=account_id)
        if not app or app.deleted_at:
            return self.failure("Application not found")
        return self.success(_application_dict_with_labels(self.db, account_id, app))

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
        cas = CustomAttributeService(self.db)
        attrs, err = cas.merge_validated(
            account_id,
            ENTITY_APPLICATION,
            data.get("custom_attributes"),
            {},
            full_required_check=True,
        )
        if err:
            return self.failure(err)
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
            custom_attributes=attrs or {},
            status="applied",
            stage_history=[{"stage": "applied", "changed_at": now.isoformat()}],
            tags=data.get("tags", []),
            created_at=now, updated_at=now,
        )
        app.save(self.db)
        logger.info(f"ApplicationService.create — id={app.id} job={job_id} email={email}")
        return self.success(_application_dict_with_labels(self.db, account_id, app))

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
        old_pipeline_stage_id = app.pipeline_stage_id
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

        pipeline_aligned = False
        if status_touch and not pipeline_touch and effective_status is not None:
            col = _first_column_matching_stage_type(self.db, account_id, app.job_id, effective_status)
            if col is not None and app.pipeline_stage_id != col.id:
                app.pipeline_stage_id = col.id
                pipeline_aligned = True

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

        if pipeline_touch or pipeline_aligned:
            from app.services.interview_sync_service import (
                sync_interview_assignments_for_pipeline_move,
            )

            sync_interview_assignments_for_pipeline_move(
                self.db,
                account_id,
                app,
                old_pipeline_stage_id,
                app.pipeline_stage_id,
            )
            _enqueue_esign_stage_transition(
                self.db,
                account_id,
                app.id,
                old_pipeline_stage_id,
                app.pipeline_stage_id,
            )

        if old_status != app.status and (app.status == "hired" or old_status == "hired"):
            _enqueue_hiring_plan_refresh(account_id, app.job_id)

        logger.info(
            f"ApplicationService.update_stage — id={app_id} status={app.status} "
            f"pipeline_stage_id={app.pipeline_stage_id}"
        )
        return self.success(_application_dict_with_labels(self.db, account_id, app))

    def update_application(self, account_id: int, app_id: int, data: dict) -> dict:
        app = Application.find_by(self.db, id=app_id, account_id=account_id)
        if not app or app.deleted_at:
            return self.failure("Application not found")
        allowed = {
            "candidate_name",
            "candidate_email",
            "candidate_phone",
            "candidate_location",
            "resume_url",
            "cover_letter",
            "linkedin_url",
            "portfolio_url",
            "tags",
            "rejection_note",
            "custom_answers",
            "custom_attributes",
        }
        updates = {k: v for k, v in data.items() if k in allowed}
        if not updates:
            return self.failure("No updatable fields provided")
        if "custom_attributes" in updates:
            cas = CustomAttributeService(self.db)
            base = app.custom_attributes if isinstance(app.custom_attributes, dict) else {}
            merged, err = cas.merge_validated(
                account_id,
                ENTITY_APPLICATION,
                updates.get("custom_attributes"),
                base,
                full_required_check=True,
            )
            if err:
                return self.failure(err)
            updates["custom_attributes"] = merged
        if "candidate_email" in updates:
            em = (updates["candidate_email"] or "").strip().lower()
            if not em:
                return self.failure("candidate_email cannot be empty")
            stmt = select(Application).where(
                Application.job_id == app.job_id,
                Application.candidate_email == em,
                Application.deleted_at == None,
                Application.id != app.id,
            )
            if self.db.execute(stmt).scalars().first() is not None:
                return self.failure("Another application with this email exists for this job")
            updates["candidate_email"] = em
        for k, v in updates.items():
            setattr(app, k, v)
        app.updated_at = datetime.now(timezone.utc)
        app.save(self.db)
        logger.info(f"ApplicationService.update_application — id={app_id}")
        return self.success(_application_dict_with_labels(self.db, account_id, app))

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
