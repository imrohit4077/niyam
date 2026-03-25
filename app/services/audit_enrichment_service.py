"""
Resolve entity display names for audit rows (worker-only; keeps HTTP path fast).
"""

from __future__ import annotations

import re
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.application import Application
from app.models.job import Job
from app.models.job_board import JobBoard


def merge_account_audit_prefs(account: Account) -> dict[str, Any]:
    raw = account.settings if isinstance(account.settings, dict) else {}
    at = raw.get("audit_trail")
    if not isinstance(at, dict):
        at = {}
    return {
        "track_read_requests": at.get("track_read_requests", True),
        "track_mutations": at.get("track_mutations", True),
    }


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
