"""Application model — candidate applied to a job."""
from datetime import datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy import BigInteger, String, Boolean, DateTime, Text, Numeric, JSON, ForeignKey, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base_model import BaseModel


class Application(BaseModel):
    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    account_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    job_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    candidate_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    source_board_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("job_boards.id", ondelete="SET NULL"), nullable=True)
    source_version_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("job_versions.id", ondelete="SET NULL"), nullable=True)
    source_posting_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("job_postings.id", ondelete="SET NULL"), nullable=True)
    source_type: Mapped[str] = mapped_column(String(50), nullable=False, server_default="direct")
    referral_user_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    candidate_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    candidate_email: Mapped[str] = mapped_column(String(255), nullable=False)
    candidate_phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    candidate_location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    resume_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    cover_letter: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    linkedin_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    portfolio_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    custom_answers: Mapped[dict] = mapped_column(JSON, nullable=False, server_default="{}")
    custom_attributes: Mapped[dict] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )

    status: Mapped[str] = mapped_column(String(50), nullable=False, server_default="applied")
    pipeline_stage_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("pipeline_stages.id", ondelete="SET NULL"), nullable=True
    )
    stage_history: Mapped[list] = mapped_column(JSON, nullable=False, server_default="[]")
    assigned_to: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    rejection_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    score: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    score_breakdown: Mapped[dict] = mapped_column(JSON, nullable=False, server_default="{}")
    tags: Mapped[list] = mapped_column(JSON, nullable=False, server_default="[]")
    # Denormalized for scalable search; refreshed by Celery after label changes.
    label_search_document: Mapped[str] = mapped_column(Text, nullable=False, server_default="")

    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    def to_dict(self):
        d = super().to_dict()
        d.pop("label_search_document", None)
        for k in ("created_at", "updated_at", "deleted_at"):
            if isinstance(d.get(k), datetime):
                d[k] = d[k].isoformat()
        if d.get("score") is not None:
            d["score"] = float(d["score"])
        return d
