"""Celery: merge template HTML + signing link for one queued EsignRequest (stage automation follow-up)."""
from __future__ import annotations

from config.celery import celery_app
from config.database import SessionLocal
from app.helpers.logger import get_logger
from app.services.esign_automation_service import EsignAutomationService

logger = get_logger(__name__)


@celery_app.task(name="forge.esign_deliver_request")
def esign_deliver_request(request_id: int) -> None:
    logger.info("esign_deliver_request task", extra={"request_id": request_id})
    db = SessionLocal()
    try:
        EsignAutomationService(db).deliver_request(request_id)
    finally:
        db.close()
