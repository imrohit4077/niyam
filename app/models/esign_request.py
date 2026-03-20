"""One sent document instance: merge snapshot, provider ref, signing token, lifecycle timestamps."""
from datetime import datetime
from typing import Any, Optional
from sqlalchemy import BigInteger, String, DateTime, Text, ForeignKey, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base_model import BaseModel


class EsignRequest(BaseModel):
    __tablename__ = "esign_requests"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    account_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    application_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    template_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("esign_templates.id", ondelete="SET NULL"), nullable=True
    )
    rule_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("esign_stage_rules.id", ondelete="SET NULL"), nullable=True
    )
    provider: Mapped[str] = mapped_column(String(50), nullable=False, server_default="internal")
    external_envelope_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, server_default="queued")
    rendered_html: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    candidate_sign_token: Mapped[str] = mapped_column(String(64), nullable=False)
    signing_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    signed_document_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    signer_legal_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    provider_metadata: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    events: Mapped[list] = mapped_column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    viewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    signed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    declined_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    def to_dict(self) -> dict:
        d = super().to_dict()
        for k in ("created_at", "updated_at", "sent_at", "viewed_at", "signed_at", "declined_at"):
            if isinstance(d.get(k), datetime):
                d[k] = d[k].isoformat()
        return d
