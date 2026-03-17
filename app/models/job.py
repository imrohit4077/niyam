"""Job model — core ATS entity, tenant-scoped."""
from datetime import datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy import BigInteger, String, Boolean, DateTime, JSON, Text, Numeric, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base_model import BaseModel


class Job(BaseModel):
    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    account_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    created_by: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), nullable=False)
    department: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    location_type: Mapped[str] = mapped_column(String(50), nullable=False, server_default="onsite")
    employment_type: Mapped[str] = mapped_column(String(50), nullable=False, server_default="full_time")
    experience_level: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    salary_min: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    salary_max: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    salary_currency: Mapped[str] = mapped_column(String(10), nullable=False, server_default="USD")
    salary_visible: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")

    status: Mapped[str] = mapped_column(String(50), nullable=False, server_default="draft")
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    closes_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    video_embed_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    seo_metadata: Mapped[dict] = mapped_column(JSON, nullable=False, server_default="{}")
    custom_fields: Mapped[dict] = mapped_column(JSON, nullable=False, server_default="{}")
    tags: Mapped[list] = mapped_column(JSON, nullable=False, server_default="[]")

    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    def to_dict(self):
        d = super().to_dict()
        for k in ("created_at", "updated_at", "published_at", "closes_at", "deleted_at"):
            if isinstance(d.get(k), datetime):
                d[k] = d[k].isoformat()
        for k in ("salary_min", "salary_max"):
            if d.get(k) is not None:
                d[k] = float(d[k])
        return d
