"""Role kickoff request — HM submits hiring intent; recruiter approves and converts to a job."""

from datetime import datetime
from decimal import Decimal
from typing import Any, Optional

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, Numeric, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base_model import BaseModel


class RoleKickoffRequest(BaseModel):
    __tablename__ = "role_kickoff_requests"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    account_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    created_by_user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    assigned_recruiter_user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    status: Mapped[str] = mapped_column(String(50), nullable=False, server_default="submitted")

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    department: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    open_positions: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    why_hiring: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    expectation_30_60_90: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    success_definition: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    skills_must_have: Mapped[list] = mapped_column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    skills_nice_to_have: Mapped[list] = mapped_column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    experience_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    salary_min: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    salary_max: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    salary_currency: Mapped[str] = mapped_column(String(10), nullable=False, server_default="USD")
    budget_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    interview_rounds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    interviewers_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    converted_job_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True
    )
    recruiter_feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    def to_dict(self) -> dict[str, Any]:
        d = super().to_dict()
        for k in ("created_at", "updated_at"):
            if isinstance(d.get(k), datetime):
                d[k] = d[k].isoformat()
        for k in ("salary_min", "salary_max"):
            if d.get(k) is not None:
                d[k] = float(d[k])
        return d
