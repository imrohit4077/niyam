"""Convert an approved role kickoff into a job (pipeline stages + structured hiring)."""

from __future__ import annotations

from config.celery import celery_app
from config.database import SessionLocal
from app.helpers.logger import get_logger
from app.services.role_kickoff_request_service import RoleKickoffRequestService

logger = get_logger(__name__)


@celery_app.task(
    name="niyam.role_kickoff_convert",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    ignore_result=True,
)
def role_kickoff_convert(self, account_id: int, kickoff_id: int, recruiter_user_id: int) -> None:
    db = SessionLocal()
    try:
        res = RoleKickoffRequestService(db).convert_to_job(account_id, kickoff_id, recruiter_user_id)
        if not res.get("ok"):
            logger.error(
                "role_kickoff_convert failed",
                extra={"account_id": account_id, "kickoff_id": kickoff_id, "error": res.get("error")},
            )
            return
        job_id = (res.get("data") or {}).get("id")
        if not job_id:
            logger.error(
                "role_kickoff_convert missing job id",
                extra={"account_id": account_id, "kickoff_id": kickoff_id},
            )
            return
        from app.jobs.role_kickoff_post_convert_job import role_kickoff_post_convert

        role_kickoff_post_convert.delay(
            account_id=account_id,
            kickoff_id=kickoff_id,
            primary_job_id=int(job_id),
        )
    except Exception as exc:
        logger.exception(
            "role_kickoff_convert exception",
            extra={"account_id": account_id, "kickoff_id": kickoff_id},
        )
        raise self.retry(exc=exc) from exc
    finally:
        db.close()
