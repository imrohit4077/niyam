"""CRUD for e-sign HTML templates."""
from datetime import datetime, timezone

from sqlalchemy import select

from app.helpers.esign_blocks import document_to_html, normalize_document
from app.models.esign_template import EsignTemplate
from app.services.base_service import BaseService


class EsignTemplateService(BaseService):
    def list_templates(self, account_id: int) -> dict:
        stmt = (
            select(EsignTemplate)
            .where(EsignTemplate.account_id == account_id)
            .order_by(EsignTemplate.updated_at.desc())
        )
        rows = list(self.db.execute(stmt).scalars().all())
        return self.success([t.to_dict() for t in rows])

    def get_template(self, account_id: int, template_id: int) -> dict:
        t = EsignTemplate.find_by(self.db, id=template_id, account_id=account_id)
        if not t:
            return self.failure("Template not found")
        return self.success(t.to_dict())

    def create_template(self, account_id: int, data: dict) -> dict:
        name = (data.get("name") or "").strip()
        raw_blocks = data.get("content_blocks")
        html_in = (data.get("content_html") or "").strip()
        blocks_dict: dict | None = None
        html: str
        if raw_blocks is not None:
            if not isinstance(raw_blocks, dict):
                return self.failure("content_blocks must be an object")
            try:
                blocks_dict = normalize_document(raw_blocks)
                html = document_to_html(blocks_dict)
            except ValueError as exc:
                return self.failure(str(exc))
        elif html_in:
            html = html_in
        else:
            return self.failure("Provide content_blocks (block builder) or content_html")
        if not name:
            return self.failure("name is required")
        now = datetime.now(timezone.utc)
        t = EsignTemplate(
            account_id=account_id,
            name=name,
            description=(data.get("description") or "").strip() or None,
            content_html=html,
            content_blocks=blocks_dict,
            created_at=now,
            updated_at=now,
        )
        t.save(self.db)
        return self.success(t.to_dict())

    def update_template(self, account_id: int, template_id: int, data: dict) -> dict:
        t = EsignTemplate.find_by(self.db, id=template_id, account_id=account_id)
        if not t:
            return self.failure("Template not found")
        if "name" in data:
            n = (data.get("name") or "").strip()
            if not n:
                return self.failure("name cannot be empty")
            t.name = n
        if "description" in data:
            t.description = (data.get("description") or "").strip() or None
        if "content_blocks" in data:
            raw = data.get("content_blocks")
            if raw is None:
                t.content_blocks = None
            elif isinstance(raw, dict):
                try:
                    norm = normalize_document(raw)
                    t.content_blocks = norm
                    t.content_html = document_to_html(norm)
                except ValueError as exc:
                    return self.failure(str(exc))
            else:
                return self.failure("content_blocks must be an object or null")
        elif "content_html" in data:
            h = (data.get("content_html") or "").strip()
            if not h:
                return self.failure("content_html cannot be empty")
            t.content_html = h
            t.content_blocks = None
        t.updated_at = datetime.now(timezone.utc)
        t.save(self.db)
        return self.success(t.to_dict())

    def delete_template(self, account_id: int, template_id: int) -> dict:
        t = EsignTemplate.find_by(self.db, id=template_id, account_id=account_id)
        if not t:
            return self.failure("Template not found")
        t.destroy(self.db)
        return self.success({"deleted": True})
