"""Post-conversion work: extra seat jobs, hiring plan refresh."""

from __future__ import annotations

from config.celery import celery_app
from config.database import SessionLocal
from app.helpers.logger import get_logger
from app.services.role_kickoff_request_service import RoleKickoffRequestService

logger = get_logger(__name__)


@celery_app.task(name="niyam.role_kickoff_post_convert", ignore_result=True)
def role_kickoff_post_convert(account_id: int, kickoff_id: int, primary_job_id: int) -> None:
    db = SessionLocal()
    try:
        svc = RoleKickoffRequestService(db)
        spawned = svc.spawn_linked_position_jobs(account_id, kickoff_id, primary_job_id)
        logger.info(
            "role_kickoff_post_convert",
            extra={
                "account_id": account_id,
                "kickoff_id": kickoff_id,
                "primary_job_id": primary_job_id,
                "linked_jobs_created": spawned,
            },
        )
        from app.jobs.refresh_hiring_plan_hires_job import refresh_hiring_plan_hires_made

        refresh_hiring_plan_hires_made.delay(account_id=account_id, job_id=primary_job_id)
    except Exception:
        logger.exception(
            "role_kickoff_post_convert failed",
            extra={"account_id": account_id, "kickoff_id": kickoff_id, "primary_job_id": primary_job_id},
        )
        raise
    finally:
        db.close()
