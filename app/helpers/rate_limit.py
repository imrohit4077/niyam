"""
Redis-backed API rate limiting (sliding window, atomic Lua).

Primary entry point::

    result = rate_limit("user:42", 100)
    if not result.allowed:
        # return 429

Uses a sorted-set sliding window per subject. Keys: ``niyam:ratelimit:v1:{subject}``.
"""

from __future__ import annotations

import time
import uuid
from dataclasses import dataclass
from functools import lru_cache
from typing import Any

from app.helpers.logger import get_logger
from config.settings import get_settings

logger = get_logger(__name__)

_KEY_PREFIX = "niyam:ratelimit:v1"

# Atomic: trim window → count → allow or deny. Returns {allowed, remaining, reset_at}.
_SLIDING_WINDOW_LUA = """
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]
local window_start = now - window
redis.call('ZREMRANGEBYSCORE', key, 0, window_start)
local count = redis.call('ZCARD', key)
if count < limit then
  redis.call('ZADD', key, now, member)
  redis.call('EXPIRE', key, window)
  return {1, limit - count - 1, now + window}
end
local reset = now + window
local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
if oldest[2] then
  reset = tonumber(oldest[2]) + window
end
return {0, 0, math.floor(reset)}
"""


@dataclass(frozen=True)
class RateLimitResult:
    allowed: bool
    limit: int
    remaining: int
    reset_at: int
    retry_after: int

    @property
    def retry_after_seconds(self) -> int:
        return max(0, self.retry_after)


def _redis_url() -> str:
    s = get_settings()
    explicit = (getattr(s, "RATE_LIMIT_REDIS_URL", None) or "").strip()
    return explicit or s.REDIS_URL


@lru_cache(maxsize=1)
def _sliding_window_script():
    import redis

    client = redis.from_url(_redis_url(), decode_responses=False)
    return client.register_script(_SLIDING_WINDOW_LUA)


def _redis_client():
    import redis

    return redis.from_url(_redis_url(), decode_responses=False)


def rate_limit(
    subject: str,
    limit: int,
    *,
    window_seconds: int | None = None,
) -> RateLimitResult:
    """
    Check and consume one request against ``limit`` per ``window_seconds`` (default 60).

    ``subject`` should be a stable identifier, e.g. ``user:42`` or ``ip:203.0.113.1``.
    """
    settings = get_settings()
    window = window_seconds if window_seconds is not None else settings.RATE_LIMIT_WINDOW_SECONDS
    lim = max(1, int(limit))
    now = int(time.time())
    key = f"{_KEY_PREFIX}:{subject}"
    member = f"{now}:{uuid.uuid4().hex}"

    try:
        script = _sliding_window_script()
        raw = script(keys=[key], args=[now, window, lim, member])
        allowed_flag = int(raw[0])
        remaining = max(0, int(raw[1]))
        reset_at = int(raw[2])
        allowed = allowed_flag == 1
        retry_after = max(0, reset_at - now) if not allowed else 0
        return RateLimitResult(
            allowed=allowed,
            limit=lim,
            remaining=remaining if allowed else 0,
            reset_at=reset_at,
            retry_after=retry_after,
        )
    except Exception:
        logger.exception("rate_limit Redis error subject=%s", subject)
        if settings.RATE_LIMIT_FAIL_OPEN:
            return RateLimitResult(
                allowed=True,
                limit=lim,
                remaining=lim,
                reset_at=now + window,
                retry_after=0,
            )
        return RateLimitResult(
            allowed=False,
            limit=lim,
            remaining=0,
            reset_at=now + window,
            retry_after=window,
        )


def rate_limit_headers(result: RateLimitResult) -> dict[str, str]:
    """Standard rate-limit response headers (IETF draft + common conventions)."""
    headers = {
        "X-RateLimit-Limit": str(result.limit),
        "X-RateLimit-Remaining": str(result.remaining),
        "X-RateLimit-Reset": str(result.reset_at),
    }
    if not result.allowed:
        headers["Retry-After"] = str(result.retry_after_seconds)
    return headers


def clear_rate_limit(subject: str) -> None:
    """Delete counter for a subject (tests / admin tooling)."""
    try:
        _redis_client().delete(f"{_KEY_PREFIX}:{subject}")
    except Exception:
        logger.exception("clear_rate_limit failed subject=%s", subject)
