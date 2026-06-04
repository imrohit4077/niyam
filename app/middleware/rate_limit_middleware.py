"""
Global API rate limiting (Redis sliding window).

Runs after AuthMiddleware so authenticated traffic is keyed by user id;
otherwise keyed by client IP. Public/static paths are exempt.
"""

from __future__ import annotations

import json
from typing import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.helpers.logger import get_logger
from app.helpers.rate_limit import rate_limit, rate_limit_headers
from config.settings import get_settings

logger = get_logger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Enforce ``RATE_LIMIT_REQUESTS_PER_MINUTE`` per user (JWT ``sub``) or per IP.

    Middleware order in ``main.py``: registered after ``LoggingMiddleware`` and before
    ``AuthMiddleware`` so inbound order is Audit → Auth → RateLimit → Logging → app.
    """

    EXEMPT_PATHS = {
        "/health",
        "/docs",
        "/redoc",
        "/openapi.json",
    }

    EXEMPT_PREFIXES = (
        "/files/",
    )

    def _is_exempt(self, path: str) -> bool:
        if path in self.EXEMPT_PATHS:
            return True
        return any(path.startswith(p) for p in self.EXEMPT_PREFIXES)

    def _client_ip(self, request: Request) -> str:
        forwarded = (request.headers.get("X-Forwarded-For") or "").strip()
        if forwarded:
            return forwarded.split(",")[0].strip()
        real_ip = (request.headers.get("X-Real-IP") or "").strip()
        if real_ip:
            return real_ip
        if request.client and request.client.host:
            return request.client.host
        return "unknown"

    def _subject(self, request: Request) -> str:
        user = getattr(request.state, "current_user", None)
        if isinstance(user, dict):
            sub = user.get("sub")
            if sub is not None and str(sub).strip():
                return f"user:{sub}"
        return f"ip:{self._client_ip(request)}"

    def _should_limit(self, path: str) -> bool:
        if self._is_exempt(path):
            return False
        return path.startswith("/api/")

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        settings = get_settings()
        if not settings.RATE_LIMIT_ENABLED:
            return await call_next(request)

        path = request.url.path
        if not self._should_limit(path):
            return await call_next(request)

        subject = self._subject(request)
        result = rate_limit(subject, settings.RATE_LIMIT_REQUESTS_PER_MINUTE)

        if not result.allowed:
            logger.warning(
                "rate_limit exceeded",
                extra={"subject": subject, "path": path, "method": request.method},
            )
            body = json.dumps(
                {
                    "success": False,
                    "error": "Rate limit exceeded. Try again later.",
                    "code": 429,
                }
            )
            return Response(
                content=body,
                status_code=429,
                media_type="application/json",
                headers=rate_limit_headers(result),
            )

        response = await call_next(request)
        for k, v in rate_limit_headers(result).items():
            response.headers[k] = v
        return response
