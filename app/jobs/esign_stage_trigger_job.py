"""Celery: queue e-sign rows on pipeline stage change; document merge runs in niyam.esign_deliver_request."""
from __future__ import annotations

from config.celery import celery_app
from config.database import SessionLocal
from app.helpers.logger import get_logger
from app.services.esign_automation_service import EsignAutomationService

logger = get_logger(__name__)


@celery_app.task(name="niyam.esign_on_stage_transition")
def esign_on_stage_transition(
    account_id: int,
    application_id: int,
    new_pipeline_stage_id: int | None,
) -> None:
    if new_pipeline_stage_id is None:
        return
    logger.info(
        "esign_on_stage_transition task",
        extra={
            "account_id": account_id,
            "application_id": application_id,
            "new_pipeline_stage_id": new_pipeline_stage_id,
        },
    )
    db = SessionLocal()
    try:
        ids = EsignAutomationService(db).queue_matching_esign_requests(
            account_id,
            application_id,
            new_pipeline_stage_id,
        )
    finally:
        db.close()

    # Import after queue commits so deliver tasks see rows in DB
    from app.jobs.esign_deliver_job import esign_deliver_request as deliver_task

    for rid in ids:
        deliver_task.delay(rid)
