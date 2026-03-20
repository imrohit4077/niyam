"""Scorecard — structured feedback for an assignment (tenant scoped)."""
from datetime import datetime
from typing import Any, Optional
from sqlalchemy import BigInteger, String, Text, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base_model import BaseModel


class InterviewScorecard(BaseModel):
    __tablename__ = "scorecards"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    account_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    assignment_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("interview_assignments.id", ondelete="CASCADE"), nullable=False
    )
    application_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False
    )
    job_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    interviewer_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    overall_recommendation: Mapped[str] = mapped_column(String(20), nullable=False)
    criteria_scores: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    pros: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cons: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    internal_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    def to_dict(self) -> dict:
        d = super().to_dict()
        d["scores"] = d.get("criteria_scores") or {}
        for k in ("created_at", "updated_at", "submitted_at"):
            if isinstance(d.get(k), datetime):
                d[k] = d[k].isoformat()
        return d
