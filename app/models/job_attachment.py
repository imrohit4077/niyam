"""Document link attached to a job (JD PDF, templates, etc.)."""
from datetime import datetime
from typing import Optional

from sqlalchemy import BigInteger, String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.helpers.object_storage import object_storage_enabled
from app.helpers.uploaded_file_storage import absolute_public_file_url, file_url_to_storage_key
from app.models.base_model import BaseModel


class JobAttachment(BaseModel):
    __tablename__ = "job_attachments"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    account_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    job_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    doc_type: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    file_url: Mapped[str] = mapped_column(String(1024), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    def to_dict(self) -> dict:
        d = super().to_dict()
        for k in ("created_at", "updated_at"):
            if isinstance(d.get(k), datetime):
                d[k] = d[k].isoformat()
        raw_url = d.get("file_url")
        if isinstance(raw_url, str):
            key = file_url_to_storage_key(raw_url)
            if key is not None:
                d["object_key"] = key
                d["file_storage"] = "minio" if object_storage_enabled() else "local"
            else:
                d["object_key"] = None
                d["file_storage"] = "external"
            d["file_url"] = absolute_public_file_url(raw_url)
        return d
