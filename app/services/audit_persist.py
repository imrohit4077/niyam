"""
Shared audit row preparation and persistence (single Celery task or batched flush).

prepare_audit_row_for_insert returns a dict suitable for AuditLogEntry(**row) or None if skipped.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.helpers.audit_route_catalog import describe_request
from app.models.account import Account
from app.models.account_user import AccountUser
from app.models.audit_log_entry import AuditLogEntry
from app.services.audit_enrichment_service import (
    assign_log_category,
    enrich_metadata,
    merge_account_audit_prefs,
    should_record_http_audit,
)


def _coerce_created_at(raw: Any) -> datetime:
    if isinstance(raw, datetime):
        return raw if raw.tzinfo else raw.replace(tzinfo=timezone.utc)
    if isinstance(raw, str):
        s = raw.replace("Z", "+00:00") if raw.endswith("Z") else raw
        return datetime.fromisoformat(s)
    return datetime.now(timezone.utc)


def prepare_audit_row_for_insert(db: Session, kwargs: dict[str, Any]) -> dict[str, Any] | None:
    """
    Build column dict for AuditLogEntry or None if policy skips this event.
    Mutates a copy of kwargs for enrichment paths.
    """
    kw = dict(kwargs)
    if "metadata" in kw:
        kw["metadata_"] = kw.pop("metadata")

    if "account_id" not in kw and kw.get("actor_user_id"):
        au = AccountUser.find_by(db, user_id=kw["actor_user_id"])
        if not au:
            return None
        kw["account_id"] = au.account_id

    account_id = kw.get("account_id")
    if account_id is None:
        return None

    acc = Account.find_by(db, id=int(account_id))
    if not acc:
        return None
    prefs = merge_account_audit_prefs(acc)
    method = (kw.get("http_method") or "GET").upper()

    if "created_at" not in kw:
        kw["created_at"] = datetime.now(timezone.utc)
    else:
        kw["created_at"] = _coerce_created_at(kw["created_at"])

    if "metadata_" not in kw:
        kw["metadata_"] = {}

    meta: dict[str, Any] = dict(kw["metadata_"])
    path = kw.get("path") or ""
    status_code = int(kw.get("status_code") or 0)

    is_settings_ui = bool(meta.get("settings_ui")) or meta.get("source") == "settings_ui"

    if not is_settings_ui and not meta.get("from_catalog") and path:
        desc = describe_request(method, path)
        kw["action"] = desc["action_code"]
        kw["resource"] = desc.get("feature_area", "workspace")
        for k, v in desc.items():
            meta[k] = v
        meta["from_catalog"] = True

    kw.setdefault("event_source", meta.get("event_source") or "api")
    if kw.get("request_id"):
        meta["request_id"] = kw["request_id"]

    if not is_settings_ui and not should_record_http_audit(method=method, meta=meta, prefs=prefs):
        return None

    if is_settings_ui:
        meta.setdefault("event_source", kw.get("event_source") or "ui")
        kw["event_source"] = meta.get("event_source") or "ui"
        kw["log_category"] = "audit"
        kw["metadata_"] = enrich_metadata(
            db,
            account_id=int(account_id),
            path=path,
            method=method,
            status_code=status_code,
            base=meta,
        )
        return _audit_row_dict(kw)

    meta = enrich_metadata(
        db,
        account_id=int(account_id),
        path=path,
        method=method,
        status_code=status_code,
        base=meta,
    )
    kw["metadata_"] = meta
    kw["log_category"] = assign_log_category(method=method, meta=meta)
    kw.setdefault("event_source", "api")
    return _audit_row_dict(kw)


def _audit_row_dict(kw: dict[str, Any]) -> dict[str, Any]:
    """Only keys that map to AuditLogEntry columns."""
    allowed = {
        "account_id",
        "actor_user_id",
        "http_method",
        "path",
        "status_code",
        "resource_type",
        "resource_id",
        "metadata_",
        "ip_address",
        "user_agent",
        "action",
        "resource",
        "severity",
        "old_value",
        "new_value",
        "request_id",
        "log_category",
        "event_source",
        "created_at",
    }
    return {k: v for k, v in kw.items() if k in allowed}


def persist_audit_row_single(db: Session, kwargs: dict[str, Any]) -> bool:
    """One row with commit (legacy Celery task path). Returns True if inserted."""
    row = prepare_audit_row_for_insert(db, kwargs)
    if row is None:
        return False
    AuditLogEntry.create(db, **row)
    return True
