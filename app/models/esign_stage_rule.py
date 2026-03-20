"""When a candidate enters a pipeline stage (or account-wide stage type), send an e-sign template."""
from datetime import datetime
from typing import Optional
from sqlalchemy import BigInteger, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base_model import BaseModel


class EsignStageRule(BaseModel):
    __tablename__ = "esign_stage_rules"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    account_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    job_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=True)
    pipeline_stage_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("pipeline_stages.id", ondelete="CASCADE"), nullable=True
    )
    trigger_stage_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    action_type: Mapped[str] = mapped_column(String(50), nullable=False, server_default="send_esign")
    template_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("esign_templates.id", ondelete="CASCADE"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    def to_dict(self) -> dict:
        d = super().to_dict()
        for k in ("created_at", "updated_at"):
            if isinstance(d.get(k), datetime):
                d[k] = d[k].isoformat()
        return d
