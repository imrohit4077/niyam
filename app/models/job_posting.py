"""JobPosting model — distribution record (job × board)."""
from datetime import datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy import BigInteger, String, Boolean, DateTime, Text, Integer, Numeric, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base_model import BaseModel


class JobPosting(BaseModel):
    __tablename__ = "job_postings"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    account_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    job_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    job_version_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("job_versions.id", ondelete="SET NULL"), nullable=True)
    board_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("job_boards.id", ondelete="RESTRICT"), nullable=False)
    posted_by: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    external_job_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    external_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    external_apply_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    status: Mapped[str] = mapped_column(String(50), nullable=False, server_default="pending")
    failure_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")

    scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    posted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    withdrawn_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    cost_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    cost_currency: Mapped[str] = mapped_column(String(10), nullable=False, server_default="USD")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    def to_dict(self):
        d = super().to_dict()
        for k in ("created_at", "updated_at", "posted_at", "expires_at", "withdrawn_at", "scheduled_at"):
            if isinstance(d.get(k), datetime):
                d[k] = d[k].isoformat()
        if d.get("cost_amount") is not None:
            d["cost_amount"] = float(d["cost_amount"])
        return d
