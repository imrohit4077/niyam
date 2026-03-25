"""
Resolve entity display names for audit rows (worker-only; keeps HTTP path fast).
"""

from __future__ import annotations

import re
from typing import Any

from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.application import Application
from app.models.job import Job
from app.models.job_board import JobBoard


def merge_account_audit_prefs(account: Account) -> dict[str, Any]:
    """
    Workspace audit policy (stored in accounts.settings['audit_trail']).

    - track_mutations: POST/PUT/PATCH/DELETE (recommended on).
    - track_sensitive_reads: GET on routes catalogued as PII/sensitive (Greenhouse-style access log).
    - track_all_reads: every GET (noisy; off by default for new workspaces).
    Legacy key track_read_requests maps to track_all_reads when track_all_reads is unset.
    """
    raw = account.settings if isinstance(account.settings, dict) else {}
    at = raw.get("audit_trail")
    if not isinstance(at, dict):
        at = {}
    if "track_all_reads" in at:
        track_all_reads = bool(at["track_all_reads"])
    elif "track_read_requests" in at:
        track_all_reads = bool(at["track_read_requests"])
    else:
        track_all_reads = False
    return {
        "track_mutations": at.get("track_mutations", True),
        "track_sensitive_reads": at.get("track_sensitive_reads", True),
        "track_all_reads": track_all_reads,
        # Backward compat for older UIs / API clients
        "track_read_requests": track_all_reads,
    }


def should_record_http_audit(*, method: str, meta: dict[str, Any], prefs: dict[str, Any]) -> bool:
    """Whether the worker should persist this HTTP-derived row (policy gate)."""
    m = method.upper()
    if m in ("POST", "PUT", "PATCH", "DELETE"):
        return bool(prefs.get("track_mutations", True))
    if m == "GET":
        if not prefs.get("track_sensitive_reads") and not prefs.get("track_all_reads"):
            return False
        sensitive = bool(meta.get("sensitive")) or meta.get("sensitivity") == "pii"
        if prefs.get("track_all_reads"):
            return True
        return bool(prefs.get("track_sensitive_reads")) and sensitive
    return True


def assign_log_category(*, method: str, meta: dict[str, Any]) -> str:
    """
    audit — compliance/security (mutations, permission changes, sensitive reads).
    activity — routine GET browsing when track_all_reads is enabled.
    system — reserved for jobs/cron (not HTTP middleware).
    """
    m = method.upper()
    if m in ("POST", "PUT", "PATCH", "DELETE"):
        return "audit"
    if m == "GET":
        sensitive = bool(meta.get("sensitive")) or meta.get("sensitivity") == "pii"
        if sensitive:
            return "audit"
        return "activity"
    return "audit"


def assign_access_kind(*, method: str, meta: dict[str, Any]) -> str:
    m = method.upper()
    if m in ("POST", "PUT", "PATCH", "DELETE"):
        return "mutate"
    if m == "GET":
        sensitive = bool(meta.get("sensitive")) or meta.get("sensitivity") == "pii"
        return "sensitive_read" if sensitive else "routine_read"
    return "other"


def enrich_metadata(
    db: Session,
    *,
    account_id: int,
    path: str,
    method: str,
    status_code: int,
    base: dict[str, Any],
) -> dict[str, Any]:
    """Add entity_name, outcome label, and context for end users."""
    meta = dict(base)
    meta["http_status"] = status_code
    meta["outcome"] = _outcome_label(status_code)
    meta["success"] = 200 <= status_code < 400

    # Entity resolution (best-effort; never raise)
    try:
        m = re.match(r"^/api/v1/applications/(\d+)", path)
        if m:
            app = Application.find_by(db, id=int(m.group(1)), account_id=account_id)
            if app:
                name = app.candidate_name or app.candidate_email or f"Application #{app.id}"
                meta["entity_type"] = "application"
                meta["entity_id"] = app.id
                meta["entity_name"] = name
                meta["candidate_display"] = name
                if app.candidate_email:
                    meta["candidate_email"] = app.candidate_email

        m = re.match(r"^/api/v1/jobs/(\d+)(?:/|$)", path)
        if m and "entity_name" not in meta:
            job = Job.find_by(db, id=int(m.group(1)), account_id=account_id)
            if job:
                meta["entity_type"] = "job"
                meta["entity_id"] = job.id
                meta["entity_name"] = job.title
                meta["job_title"] = job.title

        m = re.match(r"^/api/v1/job-boards/(\d+)", path)
        if m:
            jb = JobBoard.find_by(db, id=int(m.group(1)))
            if jb:
                meta["entity_type"] = "job_board"
                meta["entity_id"] = jb.id
                meta["entity_name"] = jb.name
    except Exception:
        pass

    # Improve summary when we have entity_name
    summary = meta.get("summary") or ""
    if meta.get("entity_name") and meta.get("feature_label"):
        if method.upper() == "GET":
            meta["summary"] = f"Viewed {meta['feature_label'].lower()} — {meta['entity_name']}"
        elif method.upper() in ("PUT", "PATCH"):
            meta["summary"] = f"Updated {meta['feature_label'].lower()} — {meta['entity_name']}"
        elif method.upper() == "POST":
            meta["summary"] = f"Created in {meta['feature_label'].lower()} — {meta['entity_name']}"
        elif method.upper() == "DELETE":
            meta["summary"] = f"Removed {meta['feature_label'].lower()} — {meta['entity_name']}"
        else:
            meta["summary"] = summary
    meta["access_kind"] = assign_access_kind(method=method, meta=meta)
    return meta


def _outcome_label(status_code: int) -> str:
    if 200 <= status_code < 300:
        return "Success"
    if 300 <= status_code < 400:
        return "Redirect"
    if 400 <= status_code < 500:
        return "Client error"
    if status_code >= 500:
        return "Server error"
    return "Unknown"
