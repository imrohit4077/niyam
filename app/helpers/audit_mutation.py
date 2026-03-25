"""Derive audit action labels and severity for mutating API calls (POST/PUT/PATCH/DELETE)."""

from __future__ import annotations

import re


def severity_for_http_status(status_code: int) -> str:
    if status_code >= 500:
        return "high"
    if status_code >= 400:
        return "medium"
    return "info"


def derive_mutation_action(http_method: str, path: str) -> str:
    """
    Stable action key for accountability (who changed what via which route).
    Example: api.post.api.v1.jobs
    """
    p = path.strip("/")
    safe = re.sub(r"[^a-zA-Z0-9/]+", "_", p).lower().replace("/", ".")[:180]
    return f"api.{http_method.lower()}.{safe}"


def mutation_metadata(*, http_method: str, path: str, status_code: int) -> dict:
    """Extra JSON for UI: outcome bucket, compliance-oriented flags."""
    mu = (http_method or "GET").upper()
    is_mut = mu in ("POST", "PUT", "PATCH", "DELETE")
    outcome = "success" if 200 <= status_code < 400 else "error"
    if 400 <= status_code < 500:
        outcome = "client_error"
    elif status_code >= 500:
        outcome = "server_error"
    return {
        "mutation": is_mut,
        "http_method": http_method,
        "path": path,
        "status_code": status_code,
        "outcome": outcome,
        "tracks_accountability": is_mut,
    }
