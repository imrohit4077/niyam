"""Append a row to audit_log_entries (async). Retries with backoff; final failures recorded for admin review."""

from typing import Any

from celery import Task

from config.celery import celery_app
from config.database import SessionLocal
from app.helpers.audit_failure_recorder import record_audit_delivery_failure
from app.helpers.logger import get_logger
from app.services.audit_persist import persist_audit_row_single

logger = get_logger(__name__)


class AuditLogAppendTask(Task):
    """After all retries are exhausted, persist a delivery-failure row for admin visibility."""

    def on_failure(self, exc: Exception, task_id: str, args: tuple, kwargs: dict, einfo: Any) -> None:
        try:
            kw = kwargs or {}
            if not kw and hasattr(self, "request"):
                req_kw = getattr(self.request, "kwargs", None)
                if isinstance(req_kw, dict):
                    kw = req_kw
            record_audit_delivery_failure(
                kwargs=kw,
                error_message=f"{type(exc).__name__}: {exc}",
                celery_task_id=task_id,
            )
        except Exception:
            logger.exception("AuditLogAppendTask.on_failure: recorder failed")


@celery_app.task(
    bind=True,
    base=AuditLogAppendTask,
    name="forge.audit_log_append",
    ignore_result=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
    retry_kwargs={"max_retries": 5},
)
def audit_log_append(self: Any, **kwargs: Any) -> None:
    """Insert one audit row (fallback path when Redis buffer is off or push failed)."""
    db = SessionLocal()
    try:
        if "metadata" in kwargs:
            kwargs["metadata_"] = kwargs.pop("metadata")
        persist_audit_row_single(db, kwargs)
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
