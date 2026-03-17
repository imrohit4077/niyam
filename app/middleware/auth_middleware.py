"""
Authentication middleware: validate JWT and set request.state.current_user (payload dict).
Rails equivalent: before_action :authenticate_user!
No model import — current_user is the decoded JWT payload. Your controller can load the model if needed.
"""

from typing import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.helpers.jwt_helper import JWTHelper


class AuthMiddleware(BaseHTTPMiddleware):
    """
    Reads Authorization: Bearer <token>, decodes JWT, sets request.state.current_user to payload dict.
    Public paths skip validation. No DB/model dependency — framework only.
    """

    PUBLIC_PATHS = {
        "/health",
        "/docs",
        "/redoc",
        "/openapi.json",
        "/api/v1/auth/login",
        "/api/v1/auth/refresh",
    }

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request.state.current_user = None
        path = request.url.path
        if any(path == p or path.startswith(p + "/") for p in self.PUBLIC_PATHS):
            return await call_next(request)
        auth = request.headers.get("Authorization")
        if not auth or not auth.startswith("Bearer "):
            return await call_next(request)
        token = auth[7:].strip()
        if not token:
            return await call_next(request)
        try:
            payload = JWTHelper.decode_token(token)
            if payload.get("type") == "access":
                request.state.current_user = payload
        except Exception:
            pass
        return await call_next(request)
