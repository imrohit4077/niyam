"""Persist a row when Celery cannot append to audit_log_entries after all retries (best-effort)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from config.database import SessionLocal
from app.helpers.logger import get_logger
from app.models.audit_log_delivery_failure import AuditLogDeliveryFailure

logger = get_logger(__name__)


def record_audit_delivery_failure(
    *,
    kwargs: dict[str, Any],
    error_message: str,
    celery_task_id: str | None,
) -> None:
    """
    Insert into audit_log_delivery_failures. Must not raise (Celery on_failure runs here).
    """
    account_id = kwargs.get("account_id")
    if account_id is None:
        logger.warning("record_audit_delivery_failure skipped: no account_id in payload")
        return

    payload: dict[str, Any] = {}
    for k, v in kwargs.items():
        if v is None:
            continue
        if k == "metadata_" and isinstance(v, dict) and len(str(v)) > 8000:
            payload[k] = {"_truncated": True, "keys": list(v.keys())}
        else:
            payload[k] = v

    db = SessionLocal()
    try:
        row = AuditLogDeliveryFailure(
            account_id=int(account_id),
            actor_user_id=int(kwargs["actor_user_id"]) if kwargs.get("actor_user_id") is not None else None,
            attempted_payload=payload,
            error_message=error_message[:8000],
            celery_task_id=celery_task_id,
            created_at=datetime.now(timezone.utc),
        )
        db.add(row)
        db.commit()
    except Exception:
        logger.exception("record_audit_delivery_failure: could not persist failure row")
        db.rollback()
    finally:
        db.close()
