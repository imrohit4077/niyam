"""
JWT token creation and validation.
Rails equivalent: Devise JWT / custom token logic
"""

from datetime import datetime, timezone, timedelta
from typing import Any

from jose import JWTError, jwt

from config.settings import get_settings

settings = get_settings()


class JWTHelper:
    """Create and decode JWT access/refresh tokens."""

    @staticmethod
    def create_access_token(user_id: int, email: str, role: str) -> str:
        """Create short-lived access token (e.g. 15 min)."""
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        payload = {
            "sub": str(user_id),
            "email": email,
            "role": role,
            "type": "access",
            "exp": expire,
            "iat": datetime.now(timezone.utc),
        }
        return jwt.encode(
            payload,
            settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM,
        )

    @staticmethod
    def create_refresh_token(user_id: int) -> str:
        """Create long-lived refresh token (e.g. 7 days)."""
        expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        payload = {
            "sub": str(user_id),
            "type": "refresh",
            "exp": expire,
            "iat": datetime.now(timezone.utc),
        }
        return jwt.encode(
            payload,
            settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM,
        )

    @staticmethod
    def decode_token(token: str) -> dict[str, Any]:
        """Decode and validate token; return payload or raise."""
        try:
            payload = jwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM],
            )
            return payload
        except JWTError as e:
            raise ValueError(f"Invalid token: {e}") from e

    @staticmethod
    def is_token_expired(token: str) -> bool:
        """Return True if token is expired or invalid."""
        try:
            payload = JWTHelper.decode_token(token)
            exp = payload.get("exp")
            if not exp:
                return True
            return datetime.fromtimestamp(exp, tz=timezone.utc) < datetime.now(timezone.utc)
        except Exception:
            return True
