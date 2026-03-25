"""
After authenticated API requests, enqueue append-only audit rows (Celery).

Mutations: POST/PUT/PATCH/DELETE — always subject to account audit_trail.track_mutations.

Reads: GET — only when account allows track_read_requests (enforced in worker); skips self-audit endpoints.
"""

from typing import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.helpers.audit_enqueue import enqueue_api_audit, should_skip_audit_get


class AuditLogMiddleware(BaseHTTPMiddleware):
    """Runs inside the stack after AuthMiddleware so request.state.current_user is set."""

    _SKIP_PREFIXES: tuple[str, ...] = (
        "/api/v1/auth/",
        "/api/v1/public/",
        "/api/v1/webhooks/",
    )

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        try:
            self._maybe_enqueue(request, response)
        except Exception:
            pass
        return response

    def _maybe_enqueue(self, request: Request, response: Response) -> None:
        method = request.method.upper()
        if method not in ("GET", "POST", "PUT", "PATCH", "DELETE"):
            return
        path = request.url.path
        if not path.startswith("/api/v1"):
            return
        for prefix in self._SKIP_PREFIXES:
            if path.startswith(prefix):
                return
        if method == "GET" and should_skip_audit_get(path):
            return
        user = getattr(request.state, "current_user", None)
        if not user or not isinstance(user, dict):
            return
        sub = user.get("sub")
        if not sub:
            return
        try:
            uid = int(sub)
        except (TypeError, ValueError):
            return
        client = request.client
        ip = client.host if client else None
        ua = request.headers.get("user-agent")
        enqueue_api_audit(
            actor_user_id=uid,
            http_method=request.method,
            path=path,
            status_code=response.status_code,
            ip_address=ip,
            user_agent=ua,
        )
