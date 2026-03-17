"""Auth: JWT validation, request.state.current_user."""

from typing import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.helpers.jwt_helper import JWTHelper


class AuthMiddleware(BaseHTTPMiddleware):
    PUBLIC_PATHS = {"/health", "/docs", "/redoc", "/openapi.json"}

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
