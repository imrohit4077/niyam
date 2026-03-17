"""
Account model (tenant).
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import BigInteger, String, DateTime, JSON, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base_model import BaseModel


class Account(BaseModel):
    __tablename__ = "accounts"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    plan: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, server_default="active")
    settings: Mapped[dict] = mapped_column(JSON, nullable=False, server_default=text("'{}'"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
