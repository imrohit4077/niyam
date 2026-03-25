"""
Request/response logging middleware.
Rails equivalent: Rack::CommonLogger / lograge
"""

import time
from typing import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.helpers.logger import get_logger

logger = get_logger(__name__)


class LoggingMiddleware(BaseHTTPMiddleware):
    """Log each request method, path, and response status + duration."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start = time.perf_counter()
        response = await call_next(request)
        elapsed = time.perf_counter() - start
        logger.info(
            "%s %s → %s %.3fs",
            request.method,
            request.url.path,
            response.status_code,
            elapsed,
        )
        return response
