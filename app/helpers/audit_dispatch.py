"""
Route audit payloads to Redis buffer (batched DB flush) or direct Celery (fallback).
"""

from __future__ import annotations

from typing import Any

from app.helpers.logger import get_logger

logger = get_logger(__name__)


def dispatch_audit_payload(payload: dict[str, Any]) -> None:
    """
    If AUDIT_LOG_BUFFER_ENABLED: LPUSH to Redis (periodic flush writes DB).
    On Redis errors: fall back to forge.audit_log_append Celery task.
    If buffer disabled: Celery only (legacy behavior).
    """
    from config.settings import get_settings

    s = get_settings()
    if getattr(s, "AUDIT_LOG_BUFFER_ENABLED", True):
        try:
            from app.helpers.audit_redis_buffer import push_audit_payload

            push_audit_payload(payload)
            return
        except Exception:
            logger.exception("audit buffer push failed — falling back to Celery")

    from app.jobs.audit_log_append_job import audit_log_append

    audit_log_append.apply_async(kwargs=payload, queue="default")
