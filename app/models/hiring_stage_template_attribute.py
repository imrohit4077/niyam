"""Junction: stage template ↔ focus attribute (ordered)."""

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base_model import BaseModel


class HiringStageTemplateAttribute(BaseModel):
    __tablename__ = "hiring_stage_template_attributes"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    hiring_stage_template_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("hiring_stage_templates.id", ondelete="CASCADE"), nullable=False
    )
    hiring_attribute_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("hiring_attributes.id", ondelete="CASCADE"), nullable=False
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
