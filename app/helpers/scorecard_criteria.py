"""Normalize job-level scorecard attribute templates and validate submitted scores."""
from __future__ import annotations

from typing import Any


def normalize_job_criteria(raw: Any) -> list[dict[str, Any]]:
    """
    Accepts [] or [{"name": "DSA", "scale_max": 5, "required": true}, "Communication", ...].
    """
    if raw is None:
        return []
    if not isinstance(raw, list):
        return []
    out: list[dict[str, Any]] = []
    for item in raw:
        if isinstance(item, str):
            name = item.strip()
            if name:
                out.append({"name": name, "scale_max": 5, "required": True})
        elif isinstance(item, dict):
            name = str(item.get("name") or "").strip()
            if not name:
                continue
            sm = item.get("scale_max", 5)
            try:
                scale_max = int(sm)
            except (TypeError, ValueError):
                scale_max = 5
            scale_max = max(1, min(scale_max, 10))
            req = item.get("required", True)
            out.append({"name": name, "scale_max": scale_max, "required": bool(req)})
    return out


def validate_criteria_scores(
    criteria: list[dict[str, Any]],
    scores: dict[str, Any],
) -> str | None:
    """Return error message if validation fails; None if OK."""
    if not criteria:
        return None
    for c in criteria:
        if not c.get("required", True):
            continue
        name = c["name"]
        scale_max = int(c.get("scale_max", 5))
        if name not in scores:
            return f'Missing required score for "{name}"'
        val = scores[name]
        try:
            num = float(val)
        except (TypeError, ValueError):
            return f'Score for "{name}" must be a number'
        if num < 1 or num > scale_max:
            return f'Score for "{name}" must be between 1 and {scale_max}'
    return None


def average_numeric_scores(scores: dict[str, Any]) -> float | None:
    nums: list[float] = []
    for v in scores.values():
        try:
            nums.append(float(v))
        except (TypeError, ValueError):
            continue
    if not nums:
        return None
    return round(sum(nums) / len(nums), 2)


BIAS_PROXY_TERMS = (
    "young",
    "old",
    "older",
    "younger",
    "millennial",
    "boomer",
    "female",
    "male",
    "woman",
    "man",
    "mom",
    "mother",
    "pregnant",
    "religion",
    "race",
    "ethnic",
    "accent",
    "attractive",
    "looks",
)


def scan_bias_proxies(text: str | None) -> list[str]:
    """Lightweight heuristic flags (not ML). For recruiter review only."""
    if not text or not text.strip():
        return []
    lower = text.lower()
    found: list[str] = []
    for term in BIAS_PROXY_TERMS:
        if term in lower and term not in found:
            found.append(term)
    return found
