"""
Repair missing interview_assignments for applications already on interview stages.

Run after deploys or data fixes. Idempotent: only creates rows that do not exist.
Schedule via Celery Beat or trigger manually per account.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import select

from config.celery import celery_app
from config.database import SessionLocal
from app.helpers.logger import get_logger
from app.models.application import Application
from app.services.interview_sync_service import ensure_interview_assignments_for_application

logger = get_logger(__name__)


@celery_app.task(name="niyam.interview_assignments_backfill_account", ignore_result=True)
def interview_assignments_backfill_account(account_id: int, batch_size: int = 500) -> dict[str, Any]:
    """
    Scan applications in the account (non-deleted, pipeline stage set) and ensure assignments exist.
    Returns counts for observability.
    """
    db = SessionLocal()
    repaired = 0
    scanned = 0
    try:
        stmt = (
            select(Application.id)
            .where(
                Application.account_id == account_id,
                Application.deleted_at.is_(None),
                Application.pipeline_stage_id.isnot(None),
            )
            .order_by(Application.id.asc())
            .limit(batch_size)
        )
        ids = [row[0] for row in db.execute(stmt).all()]
        scanned = len(ids)
        for app_id in ids:
            n = ensure_interview_assignments_for_application(db, account_id, app_id)
            repaired += n
        return {"ok": True, "scanned": scanned, "assignments_created": repaired}
    except Exception:
        logger.exception("interview_assignments_backfill_account failed account_id=%s", account_id)
        raise
    finally:
        db.close()
