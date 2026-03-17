"""
AccountUserRole join model (RBAC: which role a user has in an account).
"""

from sqlalchemy import BigInteger, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base_model import BaseModel


class AccountUserRole(BaseModel):
    __tablename__ = "account_user_roles"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    account_user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("account_users.id", ondelete="CASCADE"), nullable=False)
    role_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)
