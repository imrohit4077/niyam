"""CRUD for e-sign HTML templates."""
from datetime import datetime, timezone

from sqlalchemy import select

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
        html = (data.get("content_html") or "").strip()
        if not name or not html:
            return self.failure("name and content_html are required")
        now = datetime.now(timezone.utc)
        t = EsignTemplate(
            account_id=account_id,
            name=name,
            description=(data.get("description") or "").strip() or None,
            content_html=html,
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
        if "content_html" in data:
            h = (data.get("content_html") or "").strip()
            if not h:
                return self.failure("content_html cannot be empty")
            t.content_html = h
        t.updated_at = datetime.now(timezone.utc)
        t.save(self.db)
        return self.success(t.to_dict())

    def delete_template(self, account_id: int, template_id: int) -> dict:
        t = EsignTemplate.find_by(self.db, id=template_id, account_id=account_id)
        if not t:
            return self.failure("Template not found")
        t.destroy(self.db)
        return self.success({"deleted": True})
