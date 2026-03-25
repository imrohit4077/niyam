"""Referral bonus payout record (HRIS / payroll handoff)."""
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import BigInteger, String, DateTime, Date, Numeric, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base_model import BaseModel


class ReferralBonus(BaseModel):
    __tablename__ = "referral_bonuses"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    account_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    application_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    referral_link_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("referral_links.id", ondelete="SET NULL"), nullable=True
    )
    referrer_user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(8), nullable=False, server_default="USD")
    status: Mapped[str] = mapped_column(String(32), nullable=False, server_default="pending")

    eligible_after: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    hris_sync_status: Mapped[str] = mapped_column(String(32), nullable=False, server_default="unsynced")
    external_payout_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    def to_dict(self):
        d = super().to_dict()
        for k in ("created_at", "updated_at", "paid_at"):
            if isinstance(d.get(k), datetime):
                d[k] = d[k].isoformat()
        if d.get("amount") is not None:
            d["amount"] = float(d["amount"])
        if isinstance(d.get("eligible_after"), date):
            d["eligible_after"] = d["eligible_after"].isoformat()
        return d
