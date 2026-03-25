"""
AuthService: login, refresh token logic.
Rails equivalent: AuthenticationService
"""

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.user import User
from app.models.account_user import AccountUser
from app.models.account_user_role import AccountUserRole
from app.models.role import Role
from app.helpers.jwt_helper import JWTHelper
from app.helpers.role_helper import highest_role_slug
from app.helpers.logger import get_logger
from app.services.base_service import BaseService

logger = get_logger(__name__)


class AuthService(BaseService):
    def __init__(self, db: Session) -> None:
        super().__init__(db)

    def login(self, email: str, password: str) -> dict:
        """Authenticate user, return tokens + user data."""
        logger.info(f"AuthService.login — attempt for email={email}")

        user = User.find_by(self.db, email=email.lower().strip())
        if not user or not user.check_password(password):
            logger.warning(f"AuthService.login — failed for email={email}")
            return self.failure("Invalid email or password")

        if user.status != "active":
            logger.warning(f"AuthService.login — inactive user id={user.id}")
            return self.failure("Account is inactive")

        role_slug = self._get_primary_role(user.id)
        logger.debug(f"AuthService.login — resolved role={role_slug} for user id={user.id}")

        user.last_login_at = datetime.now(timezone.utc)
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)

        access_token = JWTHelper.create_access_token(
            user_id=user.id, email=user.email, role=role_slug,
        )
        refresh_token = JWTHelper.create_refresh_token(user_id=user.id)

        logger.info(f"AuthService.login — success for user id={user.id}")
        return self.success({
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": user.to_safe_dict(),
        })

    def refresh(self, refresh_token: str) -> dict:
        """Issue new access token from valid refresh token."""
        logger.info("AuthService.refresh — token refresh attempt")
        try:
            payload = JWTHelper.decode_token(refresh_token)
        except ValueError as e:
            logger.warning(f"AuthService.refresh — invalid token: {e}")
            return self.failure(str(e))

        if payload.get("type") != "refresh":
            logger.warning("AuthService.refresh — wrong token type")
            return self.failure("Invalid token type")

        user_id = int(payload["sub"])
        user = User.find_by(self.db, id=user_id)
        if not user or user.status != "active":
            logger.warning(f"AuthService.refresh — user not found or inactive id={user_id}")
            return self.failure("User not found or inactive")

        role_slug = self._get_primary_role(user.id)
        access_token = JWTHelper.create_access_token(
            user_id=user.id, email=user.email, role=role_slug,
        )
        logger.info(f"AuthService.refresh — issued new access token for user id={user_id}")
        return self.success({"access_token": access_token, "token_type": "bearer"})

    def _get_primary_role(self, user_id: int) -> str:
        """Return highest-privilege role slug when multiple roles exist (e.g. superadmin over admin)."""
        au = AccountUser.find_by(self.db, user_id=user_id)
        if not au:
            return "member"
        aurs = AccountUserRole.where(self.db, account_user_id=au.id)
        if not aurs:
            return "member"
        slugs: list[str] = []
        for aur in aurs:
            role = Role.find_by(self.db, id=aur.role_id)
            if role:
                slugs.append(role.slug)
        return highest_role_slug(slugs)
