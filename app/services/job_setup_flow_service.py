"""Account-scoped job setup wizard sections + fields (DB-backed)."""
from __future__ import annotations

import json
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import select

from app.models.custom_attribute_definition import CustomAttributeDefinition
from app.models.job_setup_flow_field import JobSetupFlowField
from app.models.job_setup_flow_section import JobSetupFlowSection
from app.services.base_service import BaseService

_SECTION_KEY_RE = re.compile(r"^[a-z][a-z0-9_]{1,62}$")
_FIELD_KEY_RE = re.compile(r"^(?:[a-z][a-z0-9_]{1,62}|custom:[a-z0-9_]{2,128})$")


def _default_seed_path() -> Path:
    return Path(__file__).resolve().parents[2] / "db" / "seeds" / "job_setup_flow_default.json"


def _load_seed_document() -> dict[str, Any]:
    path = _default_seed_path()
    with open(path, encoding="utf-8") as f:
        return json.load(f)


class JobSetupFlowService(BaseService):
    def _now(self) -> datetime:
        return datetime.now(timezone.utc)

    def ensure_seeded(self, account_id: int) -> None:
        existing = JobSetupFlowSection.where(self.db, account_id=account_id)
        if existing:
            return
        doc = _load_seed_document()
        now = self._now()
        pos = 0
        for sec in doc.get("sections") or []:
            if not isinstance(sec, dict):
                continue
            sk = str(sec.get("section_key") or "").strip()
            lab = str(sec.get("label") or "").strip()
            if not sk or not lab:
                continue
            built_in = bool(sec.get("built_in", True))
            row = JobSetupFlowSection(
                account_id=account_id,
                section_key=sk,
                label=lab[:255],
                position=pos,
                is_enabled=True,
                built_in=built_in,
                created_at=now,
                updated_at=now,
            )
            self.db.add(row)
            self.db.flush()
            fpos = 0
            for fld in sec.get("fields") or []:
                if not isinstance(fld, dict):
                    continue
                fk = str(fld.get("field_key") or "").strip()
                fl = str(fld.get("label") or "").strip()
                if not fk or not fl:
                    continue
                fb = bool(fld.get("built_in", True))
                self.db.add(
                    JobSetupFlowField(
                        account_id=account_id,
                        section_id=row.id,
                        field_key=fk[:128],
                        label=fl[:255],
                        position=fpos,
                        is_enabled=True,
                        built_in=fb,
                        created_at=now,
                        updated_at=now,
                    )
                )
                fpos += 1
            pos += 1
        self.db.commit()

    def _sections_ordered(self, account_id: int) -> list[JobSetupFlowSection]:
        stmt = (
            select(JobSetupFlowSection)
            .where(JobSetupFlowSection.account_id == account_id)
            .order_by(JobSetupFlowSection.position.asc(), JobSetupFlowSection.id.asc())
        )
        return list(self.db.execute(stmt).scalars().all())

    def _fields_for_section(self, account_id: int, section_id: int) -> list[JobSetupFlowField]:
        stmt = (
            select(JobSetupFlowField)
            .where(JobSetupFlowField.account_id == account_id, JobSetupFlowField.section_id == section_id)
            .order_by(JobSetupFlowField.position.asc(), JobSetupFlowField.id.asc())
        )
        return list(self.db.execute(stmt).scalars().all())

    def build_catalog(self, account_id: int) -> list[dict[str, Any]]:
        self.ensure_seeded(account_id)
        out: list[dict[str, Any]] = []
        for sec in self._sections_ordered(account_id):
            fields = self._fields_for_section(account_id, sec.id)
            out.append(
                {
                    "id": sec.section_key,
                    "db_id": sec.id,
                    "label": sec.label,
                    "is_enabled": sec.is_enabled,
                    "built_in": sec.built_in,
                    "position": sec.position,
                    "fields": [
                        {
                            "id": f.field_key,
                            "db_id": f.id,
                            "label": f.label,
                            "is_enabled": f.is_enabled,
                            "built_in": f.built_in,
                            "position": f.position,
                        }
                        for f in fields
                    ],
                }
            )
        return out

    def preferences_from_db(self, account_id: int) -> tuple[list[str], dict[str, list[str]]]:
        self.ensure_seeded(account_id)
        enabled_sections: list[str] = []
        enabled_fields: dict[str, list[str]] = {}
        for sec in self._sections_ordered(account_id):
            if sec.is_enabled:
                enabled_sections.append(sec.section_key)
            flds = self._fields_for_section(account_id, sec.id)
            enabled_fields[sec.section_key] = [f.field_key for f in flds if f.is_enabled]
        return enabled_sections, enabled_fields

    def apply_preferences(
        self,
        account_id: int,
        *,
        enabled_section_keys: list[str] | None = None,
        enabled_fields_by_section: dict[str, list[str]] | None = None,
    ) -> dict[str, Any]:
        """Update is_enabled flags to match provided lists (order preserved for sections)."""
        self.ensure_seeded(account_id)
        now = self._now()
        sections = {s.section_key: s for s in self._sections_ordered(account_id)}

        if enabled_section_keys is not None:
            want = [str(x).strip() for x in enabled_section_keys if str(x).strip() in sections]
            if not want:
                want = list(sections.keys())
            for sk, sec in sections.items():
                sec.is_enabled = sk in set(want)
                sec.updated_at = now
            # reorder positions to match want order then append rest
            for i, sk in enumerate(want):
                if sk in sections:
                    sections[sk].position = i
            rest = [sk for sk in sections.keys() if sk not in want]
            for j, sk in enumerate(rest):
                sections[sk].position = len(want) + j

        if enabled_fields_by_section is not None:
            for sec in self._sections_ordered(account_id):
                want_fields = enabled_fields_by_section.get(sec.section_key)
                if want_fields is None:
                    continue
                flds = self._fields_for_section(account_id, sec.id)
                fld_by_key = {f.field_key: f for f in flds}
                seen: set[str] = set()
                ordered: list[str] = []
                for fk in want_fields:
                    fk = str(fk).strip()
                    if fk in fld_by_key and fk not in seen:
                        seen.add(fk)
                        ordered.append(fk)
                if not ordered:
                    ordered = [f.field_key for f in flds]
                for f in flds:
                    f.is_enabled = f.field_key in set(ordered)
                    f.updated_at = now
                for i, fk in enumerate(ordered):
                    if fk in fld_by_key:
                        fld_by_key[fk].position = i

        self.db.commit()
        return self.success({"ok": True})

    def create_section(self, account_id: int, body: dict) -> dict:
        self.ensure_seeded(account_id)
        label = str(body.get("label") or "").strip()
        if not label:
            return self.failure("label is required")
        sk_raw = str(body.get("section_key") or "").strip().lower()
        if sk_raw and not _SECTION_KEY_RE.match(sk_raw):
            return self.failure("section_key must start with a letter and use lowercase letters, digits, underscores")
        section_key = sk_raw if sk_raw else f"s_{uuid.uuid4().hex[:12]}"
        if JobSetupFlowSection.find_by(self.db, account_id=account_id, section_key=section_key):
            return self.failure("section_key already exists")
        now = self._now()
        max_pos = max((s.position for s in self._sections_ordered(account_id)), default=-1)
        row = JobSetupFlowSection(
            account_id=account_id,
            section_key=section_key,
            label=label[:255],
            position=max_pos + 1,
            is_enabled=True,
            built_in=False,
            created_at=now,
            updated_at=now,
        )
        self.db.add(row)
        self.db.flush()
        self.db.add(
            JobSetupFlowField(
                account_id=account_id,
                section_id=row.id,
                field_key="main",
                label="Main",
                position=0,
                is_enabled=True,
                built_in=False,
                created_at=now,
                updated_at=now,
            )
        )
        self.db.commit()
        self.db.refresh(row)
        return self.success(self._section_to_api(row))

    def update_section(self, account_id: int, section_db_id: int, body: dict) -> dict:
        row = JobSetupFlowSection.find_by(self.db, id=section_db_id, account_id=account_id)
        if not row:
            return self.failure("Section not found")
        now = self._now()
        if "label" in body:
            lab = str(body.get("label") or "").strip()
            if not lab:
                return self.failure("label cannot be empty")
            row.label = lab[:255]
        if "is_enabled" in body:
            row.is_enabled = bool(body.get("is_enabled"))
        if "position" in body:
            try:
                row.position = int(body.get("position"))
            except (TypeError, ValueError):
                return self.failure("position must be an integer")
        row.updated_at = now
        row.save(self.db)
        return self.success(self._section_to_api(row))

    def _section_to_api(self, row: JobSetupFlowSection) -> dict[str, Any]:
        fields = self._fields_for_section(row.account_id, row.id)
        return {
            "id": row.section_key,
            "db_id": row.id,
            "label": row.label,
            "is_enabled": row.is_enabled,
            "built_in": row.built_in,
            "position": row.position,
            "fields": [
                {
                    "id": f.field_key,
                    "db_id": f.id,
                    "label": f.label,
                    "is_enabled": f.is_enabled,
                    "built_in": f.built_in,
                    "position": f.position,
                }
                for f in fields
            ],
        }

    def destroy_section(self, account_id: int, section_db_id: int) -> dict:
        row = JobSetupFlowSection.find_by(self.db, id=section_db_id, account_id=account_id)
        if not row:
            return self.failure("Section not found")
        if row.built_in:
            return self.failure("Built-in sections cannot be deleted")
        row.destroy(self.db)
        return self.success({"deleted": True})

    def create_field(self, account_id: int, section_db_id: int, body: dict) -> dict:
        sec = JobSetupFlowSection.find_by(self.db, id=section_db_id, account_id=account_id)
        if not sec:
            return self.failure("Section not found")
        label = str(body.get("label") or "").strip()
        if not label:
            return self.failure("label is required")
        fk_raw = str(body.get("field_key") or "").strip()
        if fk_raw and not _FIELD_KEY_RE.match(fk_raw):
            return self.failure("Invalid field_key")
        field_key = fk_raw if fk_raw else f"f_{uuid.uuid4().hex[:10]}"
        if JobSetupFlowField.find_by(self.db, account_id=account_id, section_id=sec.id, field_key=field_key):
            return self.failure("field_key already exists for this section")
        now = self._now()
        flds = self._fields_for_section(account_id, sec.id)
        pos = max((f.position for f in flds), default=-1) + 1
        f = JobSetupFlowField(
            account_id=account_id,
            section_id=sec.id,
            field_key=field_key[:128],
            label=label[:255],
            position=pos,
            is_enabled=True,
            built_in=False,
            created_at=now,
            updated_at=now,
        )
        f.save(self.db)
        return self.success(
            {
                "id": f.field_key,
                "db_id": f.id,
                "label": f.label,
                "is_enabled": f.is_enabled,
                "built_in": f.built_in,
                "position": f.position,
            }
        )

    def update_field(self, account_id: int, field_db_id: int, body: dict) -> dict:
        f = JobSetupFlowField.find_by(self.db, id=field_db_id, account_id=account_id)
        if not f:
            return self.failure("Field not found")
        now = self._now()
        if "label" in body:
            lab = str(body.get("label") or "").strip()
            if not lab:
                return self.failure("label cannot be empty")
            f.label = lab[:255]
        if "is_enabled" in body:
            f.is_enabled = bool(body.get("is_enabled"))
        if "position" in body:
            try:
                f.position = int(body.get("position"))
            except (TypeError, ValueError):
                return self.failure("position must be an integer")
        f.updated_at = now
        f.save(self.db)
        return self.success(
            {
                "id": f.field_key,
                "db_id": f.id,
                "label": f.label,
                "is_enabled": f.is_enabled,
                "built_in": f.built_in,
                "position": f.position,
            }
        )

    def destroy_field(self, account_id: int, field_db_id: int) -> dict:
        f = JobSetupFlowField.find_by(self.db, id=field_db_id, account_id=account_id)
        if not f:
            return self.failure("Field not found")
        if f.built_in:
            return self.failure("Built-in fields cannot be deleted")
        f.destroy(self.db)
        return self.success({"deleted": True})

    def ensure_custom_field_placeholders(self, account_id: int, fields_by_section: dict[str, list[str]]) -> None:
        """Create missing `custom:*` field rows so legacy JSON preferences map to DB rows."""
        self.ensure_seeded(account_id)
        now = self._now()
        for sec_key, tokens in fields_by_section.items():
            if not isinstance(tokens, list):
                continue
            sk = str(sec_key).strip()
            sec = JobSetupFlowSection.find_by(self.db, account_id=account_id, section_key=sk)
            if not sec:
                continue
            existing = {f.field_key for f in self._fields_for_section(account_id, sec.id)}
            for tok in tokens:
                if not isinstance(tok, str) or not tok.startswith("custom:"):
                    continue
                fk = tok.strip()[:128]
                if fk in existing:
                    continue
                attr_key = fk[7:].strip()
                if not attr_key:
                    continue
                cad = CustomAttributeDefinition.find_by(
                    self.db, account_id=account_id, entity_type="job", attribute_key=attr_key
                )
                label = (cad.label if cad else attr_key)[:255]
                flds = self._fields_for_section(account_id, sec.id)
                pos = max((f.position for f in flds), default=-1) + 1
                self.db.add(
                    JobSetupFlowField(
                        account_id=account_id,
                        section_id=sec.id,
                        field_key=fk,
                        label=label,
                        position=pos,
                        is_enabled=True,
                        built_in=False,
                        created_at=now,
                        updated_at=now,
                    )
                )
                existing.add(fk)
        self.db.commit()
