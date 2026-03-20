"""List users in the current account (for hiring manager / recruiter pickers)."""
from sqlalchemy import select

from app.models.account_user import AccountUser
from app.models.user import User
from app.services.base_service import BaseService


class AccountMemberService(BaseService):
    def list_members(self, account_id: int) -> dict:
        stmt = (
            select(User.id, User.name, User.email)
            .join(AccountUser, AccountUser.user_id == User.id)
            .where(
                AccountUser.account_id == account_id,
                AccountUser.status == "active",
                User.status == "active",
            )
            .order_by(User.name.asc())
        )
        rows = self.db.execute(stmt).all()
        return self.success([{"id": r.id, "name": r.name, "email": r.email} for r in rows])
