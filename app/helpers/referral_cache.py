"""Optional Redis cache for referral token → link metadata (DB remains source of truth)."""
from __future__ import annotations

import json
from typing import Any

from config.settings import get_settings

_CACHE_PREFIX = "forge:referral_token:"
_TTL_SEC = 60 * 60 * 24 * 90  # 90 days


def _client():
    try:
        import redis

        return redis.from_url(get_settings().REDIS_URL, decode_responses=True)
    except Exception:
        return None


def cache_set_token(token: str, payload: dict[str, Any]) -> None:
    if not token:
        return
    r = _client()
    if r is None:
        return
    try:
        r.setex(_CACHE_PREFIX + token, _TTL_SEC, json.dumps(payload))
    except Exception:
        pass


def cache_get_token(token: str) -> dict[str, Any] | None:
    if not token:
        return None
    r = _client()
    if r is None:
        return None
    try:
        raw = r.get(_CACHE_PREFIX + token)
        if not raw:
            return None
        return json.loads(raw)
    except Exception:
        return None


def cache_delete_token(token: str) -> None:
    if not token:
        return
    r = _client()
    if r is None:
        return
    try:
        r.delete(_CACHE_PREFIX + token)
    except Exception:
        pass
