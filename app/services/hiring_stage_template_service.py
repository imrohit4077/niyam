"""Reusable hiring stage templates with default focus attributes."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import delete, select

from app.models.hiring_attribute import HiringAttribute
from app.models.hiring_stage_template import HiringStageTemplate
from app.models.hiring_stage_template_attribute import HiringStageTemplateAttribute
from app.services.base_service import BaseService


def _coerce_user_id_list(raw: Any) -> list[int]:
    if raw is None:
        return []
    if not isinstance(raw, list):
        return []
    out: list[int] = []
    for x in raw:
        try:
            out.append(int(x))
        except (TypeError, ValueError):
            continue
    return out


class HiringStageTemplateService(BaseService):
    def _default_attribute_ids(self, template_id: int) -> list[int]:
        stmt = (
            select(HiringStageTemplateAttribute.hiring_attribute_id)
            .where(HiringStageTemplateAttribute.hiring_stage_template_id == template_id)
            .order_by(HiringStageTemplateAttribute.position.asc(), HiringStageTemplateAttribute.id.asc())
        )
        return [int(x) for x in self.db.execute(stmt).scalars().all()]

    def _hydrate(self, account_id: int, row: HiringStageTemplate) -> dict[str, Any]:
        d = row.to_dict()
        attr_ids = self._default_attribute_ids(row.id)
        attrs = []
        if attr_ids:
            stmt = (
                select(HiringAttribute)
                .where(HiringAttribute.account_id == account_id, HiringAttribute.id.in_(attr_ids))
            )
            by_id = {a.id: a for a in self.db.execute(stmt).scalars().all()}
            for aid in attr_ids:
                a = by_id.get(aid)
                if a:
                    attrs.append(a.to_dict())
        d["default_attribute_ids"] = attr_ids
        d["default_attributes"] = attrs
        return d

    def list(self, account_id: int) -> dict:
        stmt = (
            select(HiringStageTemplate)
            .where(HiringStageTemplate.account_id == account_id)
            .order_by(HiringStageTemplate.position.asc(), HiringStageTemplate.id.asc())
        )
        rows = list(self.db.execute(stmt).scalars().all())
        return self.success([self._hydrate(account_id, r) for r in rows])

    def get(self, account_id: int, template_id: int) -> dict:
        row = HiringStageTemplate.find_by(self.db, id=template_id, account_id=account_id)
        if not row:
            return self.failure("Stage template not found")
        return self.success(self._hydrate(account_id, row))

    def _replace_attributes(self, template_id: int, account_id: int, attribute_ids: list[int]) -> str | None:
        seen: set[int] = set()
        clean: list[int] = []
        for x in attribute_ids:
            try:
                i = int(x)
            except (TypeError, ValueError):
                continue
            if i in seen:
                continue
            seen.add(i)
            clean.append(i)
        for aid in clean:
            ha = HiringAttribute.find_by(self.db, id=aid, account_id=account_id)
            if not ha:
                return f"Unknown attribute id {aid}"
        self.db.execute(
            delete(HiringStageTemplateAttribute).where(
                HiringStageTemplateAttribute.hiring_stage_template_id == template_id
            )
        )
        now = datetime.now(timezone.utc)
        for pos, aid in enumerate(clean):
            link = HiringStageTemplateAttribute(
                hiring_stage_template_id=template_id,
                hiring_attribute_id=aid,
                position=pos,
                created_at=now,
                updated_at=now,
            )
            self.db.add(link)
        self.db.commit()
        return None

    def create(self, account_id: int, body: dict[str, Any]) -> dict:
        name = (body.get("name") or "").strip()
        if not name:
            return self.failure("name is required")
        now = datetime.now(timezone.utc)
        row = HiringStageTemplate(
            account_id=account_id,
            name=name,
            default_interviewer_user_ids=_coerce_user_id_list(body.get("default_interviewer_user_ids")),
            position=int(body.get("position") or 0),
            created_at=now,
            updated_at=now,
        )
        row.save(self.db)
        raw_attrs = body.get("attribute_ids") if isinstance(body.get("attribute_ids"), list) else []
        clean_attr_ids: list[int] = []
        for x in raw_attrs:
            try:
                clean_attr_ids.append(int(x))
            except (TypeError, ValueError):
                continue
        err = self._replace_attributes(row.id, account_id, clean_attr_ids)
        if err:
            row.destroy(self.db)
            return self.failure(err)
        return self.success(self._hydrate(account_id, row))

    def update(self, account_id: int, template_id: int, body: dict[str, Any]) -> dict:
        row = HiringStageTemplate.find_by(self.db, id=template_id, account_id=account_id)
        if not row:
            return self.failure("Stage template not found")
        if body.get("name"):
            row.name = str(body["name"]).strip()
        if "default_interviewer_user_ids" in body:
            row.default_interviewer_user_ids = _coerce_user_id_list(body.get("default_interviewer_user_ids"))
        if body.get("position") is not None:
            row.position = int(body["position"])
        row.updated_at = datetime.now(timezone.utc)
        row.save(self.db)
        if isinstance(body.get("attribute_ids"), list):
            err = self._replace_attributes(template_id, account_id, body["attribute_ids"])
            if err:
                return self.failure(err)
        return self.success(self._hydrate(account_id, row))

    def destroy(self, account_id: int, template_id: int) -> dict:
        row = HiringStageTemplate.find_by(self.db, id=template_id, account_id=account_id)
        if not row:
            return self.failure("Stage template not found")
        row.destroy(self.db)
        return self.success({"deleted": True})
