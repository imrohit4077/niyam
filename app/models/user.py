"""
User model.
Rails equivalent: User < ApplicationRecord
"""

from datetime import datetime
from typing import Optional

import bcrypt
from sqlalchemy import BigInteger, String, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base_model import BaseModel
from app.helpers.logger import get_logger

logger = get_logger(__name__)


class User(BaseModel):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, server_default="active")
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    def set_password(self, plain: str) -> None:
        """Hash and store password using bcrypt."""
        hashed = bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt())
        self.password_hash = hashed.decode("utf-8")
        logger.debug(f"User.set_password — hashed password for user id={self.id}")

    def check_password(self, plain: str) -> bool:
        """Verify plain password against stored bcrypt hash."""
        try:
            result = bcrypt.checkpw(plain.encode("utf-8"), self.password_hash.encode("utf-8"))
            logger.debug(f"User.check_password — id={self.id} match={result}")
            return result
        except Exception as e:
            logger.error(f"User.check_password — error for id={self.id}: {e}")
            return False

    def to_safe_dict(self) -> dict:
        """Return user dict without password_hash."""
        d = self.to_dict()
        d.pop("password_hash", None)
        for k, v in d.items():
            if isinstance(v, datetime):
                d[k] = v.isoformat()
        return d
