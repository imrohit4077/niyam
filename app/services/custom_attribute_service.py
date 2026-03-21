"""Custom attribute definitions + validated JSON values on jobs and applications."""
from __future__ import annotations

import re
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import Any

from sqlalchemy import select

from app.models.custom_attribute_definition import CustomAttributeDefinition
from app.services.base_service import BaseService

ENTITY_JOB = "job"
ENTITY_APPLICATION = "application"
ENTITY_TYPES = frozenset({ENTITY_JOB, ENTITY_APPLICATION})
FIELD_TYPES = frozenset({"text", "number", "decimal", "boolean", "date", "list"})

KEY_RE = re.compile(r"^[a-z][a-z0-9_]{0,62}$")
MAX_TEXT_LEN = 4000
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _coerce_options(raw: Any) -> list[str]:
    if not isinstance(raw, list):
        return []
    out: list[str] = []
    for x in raw:
        if isinstance(x, str) and x.strip():
            out.append(x.strip())
        elif x is not None and not isinstance(x, str):
            out.append(str(x).strip())
    return [s for s in out if s]


def _is_empty_value(field_type: str, v: Any) -> bool:
    if v is None:
        return True
    if field_type == "text" and isinstance(v, str) and not v.strip():
        return True
    if field_type == "list" and (v == "" or v is None):
        return True
    return False


def _validate_one(def_row: CustomAttributeDefinition, raw: Any) -> tuple[bool, Any, str | None]:
    ft = def_row.field_type
    if ft == "text":
        if raw is None:
            return True, None, None
        s = str(raw).strip()
        if len(s) > MAX_TEXT_LEN:
            return False, None, f"{def_row.attribute_key}: text too long (max {MAX_TEXT_LEN})"
        return True, s if s else None, None
    if ft == "number":
        if raw is None or raw == "":
            return True, None, None
        try:
            n = int(raw)
        except (TypeError, ValueError):
            return False, None, f"{def_row.attribute_key}: must be an integer"
        return True, n, None
    if ft == "decimal":
        if raw is None or raw == "":
            return True, None, None
        try:
            d = Decimal(str(raw))
        except (InvalidOperation, TypeError, ValueError):
            return False, None, f"{def_row.attribute_key}: must be a number"
        return True, float(d), None
    if ft == "boolean":
        if raw is None or raw == "":
            return True, None, None
        if isinstance(raw, bool):
            return True, raw, None
        if isinstance(raw, str):
            low = raw.strip().lower()
            if low in ("true", "1", "yes", "on"):
                return True, True, None
            if low in ("false", "0", "no", "off"):
                return True, False, None
        if isinstance(raw, (int, float)):
            return True, bool(raw), None
        return False, None, f"{def_row.attribute_key}: must be a boolean"
    if ft == "date":
        if raw is None or raw == "":
            return True, None, None
        s = str(raw).strip()
        if not DATE_RE.match(s):
            return False, None, f"{def_row.attribute_key}: use YYYY-MM-DD"
        try:
            date.fromisoformat(s)
        except ValueError:
            return False, None, f"{def_row.attribute_key}: invalid date"
        return True, s, None
    if ft == "list":
        opts = _coerce_options(def_row.options)
        if not opts:
            return False, None, f"{def_row.attribute_key}: list type needs options"
        if raw is None or raw == "":
            return True, None, None
        s = str(raw).strip()
        if s not in opts:
            return False, None, f"{def_row.attribute_key}: must be one of the allowed options"
        return True, s, None
    return False, None, f"{def_row.attribute_key}: unknown field type"


class CustomAttributeService(BaseService):
    def list_definitions(self, account_id: int, entity_type: str) -> dict:
        if entity_type not in ENTITY_TYPES:
            return self.failure("entity_type must be job or application")
        stmt = (
            select(CustomAttributeDefinition)
            .where(
                CustomAttributeDefinition.account_id == account_id,
                CustomAttributeDefinition.entity_type == entity_type,
            )
            .order_by(CustomAttributeDefinition.position.asc(), CustomAttributeDefinition.id.asc())
        )
        rows = list(self.db.execute(stmt).scalars().all())
        return self.success([r.to_dict() for r in rows])

    def create_definition(self, account_id: int, body: dict) -> dict:
        et = body.get("entity_type")
        if et not in ENTITY_TYPES:
            return self.failure("entity_type must be job or application")
        key = (body.get("attribute_key") or "").strip()
        if not KEY_RE.match(key):
            return self.failure(
                "attribute_key must start with a letter and use lowercase letters, digits, underscores only"
            )
        label = (body.get("label") or "").strip()
        if not label:
            return self.failure("label is required")
        ft = body.get("field_type")
        if ft not in FIELD_TYPES:
            return self.failure(f"field_type must be one of: {', '.join(sorted(FIELD_TYPES))}")
        opts = _coerce_options(body.get("options"))
        if ft == "list" and not opts:
            return self.failure("options (non-empty list of strings) is required for list type")
        existing = CustomAttributeDefinition.find_by(
            self.db, account_id=account_id, entity_type=et, attribute_key=key
        )
        if existing:
            return self.failure("attribute_key already exists for this entity type")
        now = datetime.now(timezone.utc)
        try:
            pos = int(body.get("position", 0))
        except (TypeError, ValueError):
            pos = 0
        row = CustomAttributeDefinition(
            account_id=account_id,
            entity_type=et,
            attribute_key=key,
            label=label,
            field_type=ft,
            options=opts,
            required=bool(body.get("required")),
            position=pos,
            created_at=now,
            updated_at=now,
        )
        row.save(self.db)
        return self.success(row.to_dict())

    def update_definition(self, account_id: int, def_id: int, body: dict) -> dict:
        row = CustomAttributeDefinition.find_by(self.db, id=def_id, account_id=account_id)
        if not row:
            return self.failure("Definition not found")
        if "label" in body:
            lab = (body.get("label") or "").strip()
            if not lab:
                return self.failure("label cannot be empty")
            row.label = lab
        if "field_type" in body:
            ft = body.get("field_type")
            if ft not in FIELD_TYPES:
                return self.failure(f"field_type must be one of: {', '.join(sorted(FIELD_TYPES))}")
            row.field_type = ft
        if "options" in body:
            row.options = _coerce_options(body.get("options"))
        if "required" in body:
            row.required = bool(body.get("required"))
        if "position" in body:
            try:
                row.position = int(body.get("position", 0))
            except (TypeError, ValueError):
                row.position = 0
        if row.field_type == "list" and not _coerce_options(row.options):
            return self.failure("list type requires non-empty options")
        row.updated_at = datetime.now(timezone.utc)
        row.save(self.db)
        return self.success(row.to_dict())

    def delete_definition(self, account_id: int, def_id: int) -> dict:
        row = CustomAttributeDefinition.find_by(self.db, id=def_id, account_id=account_id)
        if not row:
            return self.failure("Definition not found")
        row.destroy(self.db)
        return self.success({"deleted": True})

    def definitions_map(self, account_id: int, entity_type: str) -> dict[str, CustomAttributeDefinition]:
        if entity_type not in ENTITY_TYPES:
            return {}
        stmt = (
            select(CustomAttributeDefinition)
            .where(
                CustomAttributeDefinition.account_id == account_id,
                CustomAttributeDefinition.entity_type == entity_type,
            )
        )
        rows = list(self.db.execute(stmt).scalars().all())
        return {r.attribute_key: r for r in rows}

    def merge_validated(
        self,
        account_id: int,
        entity_type: str,
        patch: dict[str, Any] | None,
        base: dict[str, Any] | None,
        *,
        full_required_check: bool,
    ) -> tuple[dict[str, Any] | None, str | None]:
        """
        Merge patch into base, validating only keys present in definitions.
        Unknown keys in patch → error.
        If full_required_check, every required definition must have a non-empty value in the result.
        """
        defs = self.definitions_map(account_id, entity_type)
        if not defs and not patch:
            return {}, None
        out: dict[str, Any] = dict(base) if isinstance(base, dict) else {}
        if not patch:
            patch = {}
        if not isinstance(patch, dict):
            return None, "custom values must be a JSON object"
        for k, raw in patch.items():
            if k not in defs:
                return None, f"Unknown custom attribute: {k}"
            d = defs[k]
            ok, coerced, err = _validate_one(d, raw)
            if not ok:
                return None, err or f"Invalid value for {k}"
            out[k] = coerced
        if full_required_check:
            for key, d in defs.items():
                if not d.required:
                    continue
                if _is_empty_value(d.field_type, out.get(key)):
                    return None, f"Required custom field missing or empty: {d.label} ({key})"
        return out, None
