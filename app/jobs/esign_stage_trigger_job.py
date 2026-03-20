"""Async: evaluate e-sign rules when an application moves pipeline stage."""
from config.celery import celery_app
from config.database import SessionLocal
from app.services.esign_automation_service import EsignAutomationService


@celery_app.task(name="forge.esign_on_stage_transition")
def esign_on_stage_transition(
    account_id: int,
    application_id: int,
    new_pipeline_stage_id: int | None,
) -> None:
    db = SessionLocal()
    try:
        EsignAutomationService(db).handle_stage_transition(
            account_id,
            application_id,
            new_pipeline_stage_id,
        )
    finally:
        db.close()
