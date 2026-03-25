"""Append a row to audit_log_entries (async). Retries with backoff; final failures recorded for admin review."""

from datetime import datetime, timezone
from typing import Any

from celery import Task

from config.celery import celery_app
from config.database import SessionLocal
from app.helpers.audit_failure_recorder import record_audit_delivery_failure
from app.helpers.audit_route_catalog import describe_request
from app.helpers.logger import get_logger
from app.models.account import Account
from app.models.account_user import AccountUser
from app.models.audit_log_entry import AuditLogEntry
from app.services.audit_enrichment_service import (
    assign_log_category,
    enrich_metadata,
    merge_account_audit_prefs,
    should_record_http_audit,
)

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
    """Insert one audit row. Table is append-only (DB trigger blocks UPDATE/DELETE)."""
    db = SessionLocal()
    try:
        if "metadata" in kwargs:
            kwargs["metadata_"] = kwargs.pop("metadata")
        if "account_id" not in kwargs and kwargs.get("actor_user_id"):
            au = AccountUser.find_by(db, user_id=kwargs["actor_user_id"])
            if not au:
                logger.debug("audit_log_append skipped — no account for user_id=%s", kwargs.get("actor_user_id"))
                return
            kwargs["account_id"] = au.account_id

        account_id = kwargs.get("account_id")
        if account_id is None:
            return

        acc = Account.find_by(db, id=int(account_id))
        if not acc:
            return
        prefs = merge_account_audit_prefs(acc)
        method = (kwargs.get("http_method") or "GET").upper()

        if "created_at" not in kwargs:
            kwargs["created_at"] = datetime.now(timezone.utc)
        if "metadata_" not in kwargs:
            kwargs["metadata_"] = {}

        meta: dict[str, Any] = dict(kwargs["metadata_"])
        path = kwargs.get("path") or ""
        status_code = int(kwargs.get("status_code") or 0)

        is_settings_ui = bool(meta.get("settings_ui")) or meta.get("source") == "settings_ui"

        # Merge route catalog before policy gate so sensitive flags are available for GET filtering.
        if not is_settings_ui and not meta.get("from_catalog") and path:
            desc = describe_request(method, path)
            kwargs["action"] = desc["action_code"]
            kwargs["resource"] = desc.get("feature_area", "workspace")
            for k, v in desc.items():
                meta[k] = v
            meta["from_catalog"] = True

        kwargs.setdefault("event_source", meta.get("event_source") or "api")
        if kwargs.get("request_id"):
            meta["request_id"] = kwargs["request_id"]

        if not is_settings_ui and not should_record_http_audit(method=method, meta=meta, prefs=prefs):
            return

        if is_settings_ui:
            meta.setdefault("event_source", kwargs.get("event_source") or "ui")
            kwargs["event_source"] = meta.get("event_source") or "ui"
            kwargs["log_category"] = "audit"
            kwargs["metadata_"] = enrich_metadata(
                db,
                account_id=int(account_id),
                path=path,
                method=method,
                status_code=status_code,
                base=meta,
            )
            AuditLogEntry.create(db, **kwargs)
            return

        meta = enrich_metadata(
            db,
            account_id=int(account_id),
            path=path,
            method=method,
            status_code=status_code,
            base=meta,
        )
        kwargs["metadata_"] = meta
        kwargs["log_category"] = assign_log_category(method=method, meta=meta)
        kwargs.setdefault("event_source", "api")
        AuditLogEntry.create(db, **kwargs)
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
