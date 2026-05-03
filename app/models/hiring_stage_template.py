"""Reusable hiring stage template — maps default focus attributes; used in kickoffs and job pipeline."""

from datetime import datetime
from typing import Any

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, String, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base_model import BaseModel


class HiringStageTemplate(BaseModel):
    __tablename__ = "hiring_stage_templates"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    account_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    default_interviewer_user_ids: Mapped[list] = mapped_column(
        JSONB, nullable=False, server_default=text("'[]'::jsonb")
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    def to_dict(self) -> dict[str, Any]:
        d = super().to_dict()
        for k in ("created_at", "updated_at"):
            if isinstance(d.get(k), datetime):
                d[k] = d[k].isoformat()
        return d
