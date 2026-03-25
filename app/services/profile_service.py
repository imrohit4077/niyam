"""
ProfileService: fetch and update current user profile.
"""

from datetime import datetime

from sqlalchemy.orm import Session

from app.models.user import User
from app.models.account_user import AccountUser
from app.models.account_user_role import AccountUserRole
from app.models.role import Role
from app.models.account import Account
from app.helpers.logger import get_logger
from app.helpers.role_helper import highest_role_slug
from app.services.base_service import BaseService

logger = get_logger(__name__)


class ProfileService(BaseService):
    def __init__(self, db: Session) -> None:
        super().__init__(db)

    def get_profile(self, user_id: int) -> dict:
        """Return user profile with account and role info."""
        logger.info(f"ProfileService.get_profile — user_id={user_id}")

        user = User.find_by(self.db, id=user_id)
        if not user:
            logger.warning(f"ProfileService.get_profile — user not found id={user_id}")
            return self.failure("User not found")

        profile = user.to_safe_dict()

        au = AccountUser.find_by(self.db, user_id=user_id)
        if au:
            account = Account.find_by(self.db, id=au.account_id)
            aurs = AccountUserRole.where(self.db, account_user_id=au.id)
            roles = []
            for aur in aurs:
                r = Role.find_by(self.db, id=aur.role_id)
                if r:
                    roles.append(r)
            best_slug = highest_role_slug([r.slug for r in roles]) if roles else "member"
            role = next((r for r in roles if r.slug == best_slug), roles[0] if roles else None)
            profile["account"] = {
                "id": account.id,
                "name": account.name,
                "slug": account.slug,
                "plan": account.plan,
            } if account else None
            profile["role"] = {
                "id": role.id,
                "name": role.name,
                "slug": role.slug,
            } if role else None
            logger.debug(
                f"ProfileService.get_profile — account={account.slug if account else None} role={role.slug if role else None}"
            )
        else:
            profile["account"] = None
            profile["role"] = None
            logger.debug(f"ProfileService.get_profile — no account membership for user_id={user_id}")

        return self.success(profile)
