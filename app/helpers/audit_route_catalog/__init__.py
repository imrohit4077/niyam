"""
Audit route catalog: HTTP path → user-facing labels.

Rules load from YAML files in config/audit_routes/ (see loader). Add or edit *.yaml files;
files are picked up automatically on process start (sorted by filename).
"""

from __future__ import annotations

import re
from typing import Any, Callable

from app.helpers.audit_route_catalog.loader import kind as _kind
from app.helpers.audit_route_catalog.loader import load_rules_from_disk

_RULES_CACHE: list[tuple[re.Pattern[str], Callable[[re.Match[str], str], dict[str, Any] | None]]] | None = None


def reload_audit_route_rules() -> None:
    """Clear cached rules (next describe_request reloads from disk). Tests / hot-reload hooks."""
    global _RULES_CACHE
    _RULES_CACHE = None


def _rules() -> list[tuple[re.Pattern[str], Callable[[re.Match[str], str], dict[str, Any] | None]]]:
    global _RULES_CACHE
    if _RULES_CACHE is None:
        _RULES_CACHE = load_rules_from_disk()
    return _RULES_CACHE


def describe_request(method: str, path: str) -> dict[str, Any]:
    """
    Return display fields for an API request. Always includes action_type + technical_path for debugging.
    """
    method_u = method.upper()
    k = _kind(method_u)
    for pattern, fn in _rules():
        m = pattern.match(path)
        if not m:
            continue
        out = fn(m, method_u)
        if out is None:
            continue
        out["technical_path"] = path
        out["http_method"] = method_u
        out["action_type"] = out.get("action_type") or k
        out["action_kind_label"] = _action_kind_label(out["action_type"])
        return out

    short = path.replace("/api/v1/", "").strip("/")[:80] or "API"
    return {
        "action_type": k,
        "feature_area": "Workspace",
        "feature_label": "API",
        "summary": f"{method_u} · {short}",
        "action_code": f"api.{k}.{short.replace('/', '.')[:60]}",
        "technical_path": path,
        "http_method": method_u,
        "action_kind_label": _action_kind_label(k),
    }


def _action_kind_label(action_type: str) -> str:
    return {
        "read": "Info",
        "create": "Create",
        "update": "Update",
        "delete": "Delete",
        "other": "Other",
    }.get(action_type, action_type.title())
