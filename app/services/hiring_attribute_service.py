"""CRUD for global hiring attributes (structured hiring)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select

from app.models.hiring_attribute import HiringAttribute
from app.services.base_service import BaseService


class HiringAttributeService(BaseService):
    def list(self, account_id: int) -> dict:
        stmt = (
            select(HiringAttribute)
            .where(HiringAttribute.account_id == account_id)
            .order_by(HiringAttribute.position.asc(), HiringAttribute.id.asc())
        )
        rows = list(self.db.execute(stmt).scalars().all())
        return self.success([r.to_dict() for r in rows])

    def get(self, account_id: int, attr_id: int) -> dict:
        row = HiringAttribute.find_by(self.db, id=attr_id, account_id=account_id)
        if not row:
            return self.failure("Attribute not found")
        return self.success(row.to_dict())

    def create(self, account_id: int, body: dict[str, Any]) -> dict:
        name = (body.get("name") or "").strip()
        if not name:
            return self.failure("name is required")
        now = datetime.now(timezone.utc)
        row = HiringAttribute(
            account_id=account_id,
            name=name,
            category=(body.get("category") or None) and str(body.get("category")).strip() or None,
            description=(body.get("description") or None) and str(body.get("description")).strip() or None,
            position=int(body.get("position") or 0),
            created_at=now,
            updated_at=now,
        )
        row.save(self.db)
        return self.success(row.to_dict())

    def update(self, account_id: int, attr_id: int, body: dict[str, Any]) -> dict:
        row = HiringAttribute.find_by(self.db, id=attr_id, account_id=account_id)
        if not row:
            return self.failure("Attribute not found")
        if body.get("name"):
            row.name = str(body["name"]).strip()
        if "category" in body:
            row.category = (body.get("category") or None) and str(body.get("category")).strip() or None
        if "description" in body:
            row.description = (body.get("description") or None) and str(body.get("description")).strip() or None
        if body.get("position") is not None:
            row.position = int(body["position"])
        row.updated_at = datetime.now(timezone.utc)
        row.save(self.db)
        return self.success(row.to_dict())

    def destroy(self, account_id: int, attr_id: int) -> dict:
        row = HiringAttribute.find_by(self.db, id=attr_id, account_id=account_id)
        if not row:
            return self.failure("Attribute not found")
        row.destroy(self.db)
        return self.success({"deleted": True})
