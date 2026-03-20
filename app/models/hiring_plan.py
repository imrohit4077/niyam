"""Hiring plan — per-job targets, deadline, and ownership (tenant-scoped)."""
from datetime import date, datetime
from typing import Optional
from sqlalchemy import BigInteger, String, Integer, Date, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base_model import BaseModel


class HiringPlan(BaseModel):
    __tablename__ = "hiring_plans"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    account_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    job_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)

    target_hires: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")
    hires_made: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    deadline: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    hiring_manager_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    primary_recruiter_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    plan_status: Mapped[str] = mapped_column(String(50), nullable=False, server_default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    def to_dict(self) -> dict:
        d = super().to_dict()
        for k in ("created_at", "updated_at"):
            if isinstance(d.get(k), datetime):
                d[k] = d[k].isoformat()
        dl = d.get("deadline")
        if dl is not None and hasattr(dl, "isoformat"):
            d["deadline"] = dl.isoformat()
        return d
