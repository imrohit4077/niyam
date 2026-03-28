"""Drain Redis audit buffer and insert rows in one DB transaction (scheduled by Celery Beat)."""

from __future__ import annotations

import json
from typing import Any

from sqlalchemy.orm import Session

from config.celery import celery_app
from config.database import SessionLocal
from app.helpers.audit_redis_buffer import (
    drain_buffer_atomic,
    requeue_payloads_front,
    release_flush_lock,
    try_acquire_flush_lock,
)
from app.helpers.logger import get_logger
from app.models.audit_log_entry import AuditLogEntry
from app.services.audit_persist import prepare_audit_row_for_insert

logger = get_logger(__name__)


@celery_app.task(
    name="forge.audit_log_flush",
    ignore_result=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
    retry_kwargs={"max_retries": 3},
)
def audit_log_flush() -> dict[str, Any]:
    """
    Atomically drain the Redis buffer and commit audit rows in one transaction.
    Uses a short Redis lock so overlapping beat ticks do not double-drain.
    """
    if not try_acquire_flush_lock():
        logger.info("audit_log_flush skipped — another flush holds the lock")
        return {"ok": True, "skipped": True, "reason": "lock"}

    try:
        raw_items = drain_buffer_atomic()
        if not raw_items:
            return {"ok": True, "inserted": 0, "drained": 0}

        payloads: list[dict[str, Any]] = []
        for raw in raw_items:
            try:
                payloads.append(json.loads(raw))
            except json.JSONDecodeError:
                logger.warning("audit_log_flush dropped invalid JSON line")

        if not payloads:
            return {"ok": True, "inserted": 0, "drained": len(raw_items)}

        db: Session = SessionLocal()
        inserted = 0
        try:
            for kw in payloads:
                row = prepare_audit_row_for_insert(db, kw)
                if row is None:
                    continue
                db.add(AuditLogEntry(**row))
                inserted += 1
            db.commit()
            logger.info(
                "audit_log_flush committed %s rows (drained=%s)",
                inserted,
                len(payloads),
            )
            return {"ok": True, "inserted": inserted, "drained": len(payloads)}
        except Exception:
            db.rollback()
            requeue_payloads_front(payloads)
            logger.exception("audit_log_flush DB failed — batch requeued to Redis")
            raise
        finally:
            db.close()
    finally:
        release_flush_lock()
