"""Polymorphic link: account label applied to a job or application."""
from datetime import datetime
from sqlalchemy import BigInteger, String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base_model import BaseModel


class LabelAssignment(BaseModel):
    __tablename__ = "label_assignments"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    account_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    label_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("account_labels.id", ondelete="CASCADE"), nullable=False)
    labelable_type: Mapped[str] = mapped_column(String(50), nullable=False)
    labelable_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    def to_dict(self):
        d = super().to_dict()
        if isinstance(d.get("created_at"), datetime):
            d["created_at"] = d["created_at"].isoformat()
        return d
