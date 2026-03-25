"""
Audit log row (append-only at DB). Application code inserts only via Celery worker.
"""

from datetime import datetime
from typing import Any, Optional

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, String, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base_model import BaseModel


class AuditLogEntry(BaseModel):
    __tablename__ = "audit_log_entries"

    def to_dict(self) -> dict[str, Any]:
        """
        BaseModel uses c.key for each column; our JSONB column is named ``metadata`` in the DB but the
        Python attribute is ``metadata_``. getattr(self, 'metadata') would return SQLAlchemy's MetaData
        registry, breaking JSON responses for GET /account/audit_log.
        """
        d: dict[str, Any] = {}
        for c in self.__table__.columns:
            key = c.key
            if key == "metadata":
                d["metadata"] = self.metadata_
            else:
                d[key] = getattr(self, key)
        return d

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    account_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    actor_user_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    http_method: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    path: Mapped[Optional[str]] = mapped_column(String(2048), nullable=True)
    status_code: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    resource_type: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    resource_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    metadata_: Mapped[dict[str, Any]] = mapped_column("metadata", JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    ip_address: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    action: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    resource: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    severity: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    old_value: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    new_value: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
