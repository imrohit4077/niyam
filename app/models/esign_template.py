"""Reusable HTML document templates with merge-field placeholders (tenant-scoped)."""
from datetime import datetime
from typing import Optional
from sqlalchemy import BigInteger, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base_model import BaseModel


class EsignTemplate(BaseModel):
    __tablename__ = "esign_templates"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    account_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    content_html: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    def to_dict(self) -> dict:
        d = super().to_dict()
        for k in ("created_at", "updated_at"):
            if isinstance(d.get(k), datetime):
                d[k] = d[k].isoformat()
        return d
