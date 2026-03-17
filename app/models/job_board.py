"""JobBoard model — global platform registry."""
from datetime import datetime
from typing import Optional
from sqlalchemy import BigInteger, String, Boolean, DateTime, JSON, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base_model import BaseModel


class JobBoard(BaseModel):
    __tablename__ = "job_boards"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    slug: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    logo_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    website_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    integration_type: Mapped[str] = mapped_column(String(50), nullable=False, server_default="manual")
    api_endpoint: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    api_version: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    auth_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    supports_apply_redirect: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    supports_direct_apply: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    supported_countries: Mapped[list] = mapped_column(JSON, nullable=False, server_default="[]")
    supported_job_types: Mapped[list] = mapped_column(JSON, nullable=False, server_default="[]")
    required_fields: Mapped[list] = mapped_column(JSON, nullable=False, server_default="[]")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    is_premium: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    def to_dict(self):
        d = super().to_dict()
        for k in ("created_at", "updated_at"):
            if isinstance(d.get(k), datetime):
                d[k] = d[k].isoformat()
        return d
