"""
Redis list buffer for audit payloads before batched DB flush (see audit_log_flush_job).

LPUSH JSON payloads; flush job atomically drains with Lua and bulk-commits.
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from config.settings import get_settings

_BUFFER_KEY = "forge:audit_log:buffer:v1"
_FLUSH_LOCK_KEY = "forge:audit_log:flush_lock"
_LUA_DRAIN = """
local items = redis.call('LRANGE', KEYS[1], 0, -1)
redis.call('DEL', KEYS[1])
return items
"""


def _redis_url() -> str:
    s = get_settings()
    return (getattr(s, "AUDIT_LOG_REDIS_URL", None) or "").strip() or s.REDIS_URL


def _client():
    import redis

    return redis.from_url(_redis_url(), decode_responses=True)


def _json_default(o: Any) -> Any:
    if isinstance(o, datetime):
        return o.isoformat()
    raise TypeError(f"Object of type {type(o).__name__} is not JSON serializable")


def buffer_key() -> str:
    return getattr(get_settings(), "AUDIT_LOG_BUFFER_KEY", _BUFFER_KEY)


def push_audit_payload(payload: dict[str, Any]) -> None:
    """Left-push one JSON payload (FIFO drain from tail via flush job)."""
    r = _client()
    r.lpush(buffer_key(), json.dumps(payload, default=_json_default))


def drain_buffer_atomic() -> list[str]:
    """Atomically remove and return all buffered JSON strings (oldest last in list order)."""
    r = _client()
    raw = r.eval(_LUA_DRAIN, 1, buffer_key())
    if not raw:
        return []
    return list(raw)


def try_acquire_flush_lock(ttl_seconds: int = 300) -> bool:
    """Avoid overlapping flush tasks when multiple workers pick up the same schedule."""
    r = _client()
    return bool(r.set(_FLUSH_LOCK_KEY, "1", nx=True, ex=ttl_seconds))


def release_flush_lock() -> None:
    try:
        _client().delete(_FLUSH_LOCK_KEY)
    except Exception:
        pass


def requeue_payloads_front(payloads: list[dict[str, Any]]) -> None:
    """On DB failure after drain: push back so a later flush retries (reverse to preserve order)."""
    if not payloads:
        return
    r = _client()
    key = buffer_key()
    for p in reversed(payloads):
        r.lpush(key, json.dumps(p, default=_json_default))
