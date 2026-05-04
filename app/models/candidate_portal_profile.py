"""Candidate portal profile for applicant self-serve access."""
from datetime import datetime
from typing import Optional

import bcrypt
from sqlalchemy import BigInteger, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base_model import BaseModel


class CandidatePortalProfile(BaseModel):
    __tablename__ = "candidate_portal_profiles"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    account_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False
    )
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    headline: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    summary: Mapped[Optional[str]] = mapped_column(String(5000), nullable=True)
    linkedin_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    portfolio_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    profile_picture_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    resume_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, server_default="active")
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    def set_password(self, plain: str) -> None:
        self.password_hash = bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    def check_password(self, plain: str) -> bool:
        try:
            return bcrypt.checkpw(plain.encode("utf-8"), self.password_hash.encode("utf-8"))
        except Exception:
            return False

    def to_safe_dict(self) -> dict:
        d = self.to_dict()
        d.pop("password_hash", None)
        for k in ("last_login_at", "created_at", "updated_at"):
            if isinstance(d.get(k), datetime):
                d[k] = d[k].isoformat()
        return d
