"""Interview assignment — application × plan × interviewer workflow (tenant scoped)."""
from datetime import datetime
from typing import Optional
from sqlalchemy import BigInteger, String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base_model import BaseModel


class InterviewAssignment(BaseModel):
    __tablename__ = "interview_assignments"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    account_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    application_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    interview_plan_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("interview_plans.id", ondelete="CASCADE"), nullable=False
    )
    interviewer_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, server_default="pending")
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    interview_ends_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    calendar_event_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    scorecard_reminder_sent_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    def to_dict(self) -> dict:
        d = super().to_dict()
        for k in (
            "created_at",
            "updated_at",
            "scheduled_at",
            "interview_ends_at",
            "scorecard_reminder_sent_at",
        ):
            if isinstance(d.get(k), datetime):
                d[k] = d[k].isoformat()
        return d
