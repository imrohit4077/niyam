"""Workspace organization settings (accounts.name + accounts.settings['organization'])."""
from __future__ import annotations

import uuid
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any

from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import delete
from sqlalchemy.orm.attributes import flag_modified

from app.helpers.countries_catalog import valid_country_codes
from app.models.account import Account
from app.models.department import Department
from app.services.base_service import BaseService

_DEFAULT_ORGANIZATION: dict[str, Any] = {
    "logo_url": "",
    "careers_page_url": "",
    "default_language": "en",
    "default_currency": "USD",
    "timezone": "UTC",
    "departments": [],
    "enabled_country_codes": None,
}

_ALLOWED_STRING_ORG_KEYS = frozenset(
    {"logo_url", "careers_page_url", "default_language", "default_currency", "timezone"}
)
_ALLOW_PATCH_ORG_KEYS = frozenset(_DEFAULT_ORGANIZATION.keys())


def _normalize_departments(raw: Any) -> list[dict[str, str]]:
    if not isinstance(raw, list):
        return []
    out: list[dict[str, str]] = []
    for item in raw:
        if isinstance(item, dict):
            name = str(item.get("name") or "").strip()
            if not name:
                continue
            iid = str(item.get("id") or "").strip() or str(uuid.uuid4())
            out.append({"id": iid, "name": name})
        elif isinstance(item, str) and item.strip():
            out.append({"id": str(uuid.uuid4()), "name": item.strip()})
    return out


def _normalize_enabled_codes(raw: Any) -> list[str] | None:
    """None = all countries available. Non-empty list = only those codes (must exist in catalog)."""
    if raw is None:
        return None
    if not isinstance(raw, list):
        return None
    valid = valid_country_codes()
    codes: list[str] = []
    for c in raw:
        if isinstance(c, str) and len(c.strip()) >= 2:
            u = c.strip().upper()[:2]
            if u in valid:
                codes.append(u)
    if not codes:
        return None
    return sorted(set(codes))


def merged_organization_config(account_settings: dict | None) -> dict[str, Any]:
    org = deepcopy(_DEFAULT_ORGANIZATION)
    if isinstance(account_settings, dict) and isinstance(account_settings.get("organization"), dict):
        src = account_settings["organization"]
        for k, v in src.items():
            if k not in _DEFAULT_ORGANIZATION:
                continue
            if k == "departments":
                # Departments live in `departments` table; ignore legacy JSON.
                continue
            if k == "enabled_country_codes":
                org[k] = _normalize_enabled_codes(v)
                continue
            if v is None:
                continue
            if k in _ALLOWED_STRING_ORG_KEYS and isinstance(v, str):
                org[k] = v.strip() if k in ("logo_url", "careers_page_url") else v
    return org


def _departments_for_api(db: Any, account_id: int) -> list[dict[str, str]]:
    rows = Department.where(db, account_id=account_id)
    rows_sorted = sorted(rows, key=lambda d: (d.name.casefold(), d.id))
    return [{"id": str(d.id), "name": d.name} for d in rows_sorted]


def _sync_departments_table(db: Any, account_id: int, normalized: list[dict[str, str]]) -> None:
    db.execute(delete(Department).where(Department.account_id == account_id))
    now = datetime.now(timezone.utc)
    seen: set[str] = set()
    for item in normalized:
        name = (item.get("name") or "").strip()
        if not name:
            continue
        key = name.casefold()
        if key in seen:
            continue
        seen.add(key)
        row = Department(
            account_id=account_id,
            name=name[:255],
            created_at=now,
            updated_at=now,
        )
        db.add(row)
    db.flush()


class OrganizationSettingsService(BaseService):
    def get_settings(self, account_id: int) -> dict:
        acc = Account.find_by(self.db, id=account_id)
        if not acc:
            return self.failure("Account not found")
        org = merged_organization_config(acc.settings if isinstance(acc.settings, dict) else {})
        org["departments"] = _departments_for_api(self.db, account_id)
        return self.success(
            {
                "name": acc.name,
                "slug": acc.slug,
                "plan": acc.plan,
                **org,
            }
        )

    def update_settings(self, account_id: int, patch: dict) -> dict:
        acc = Account.find_by(self.db, id=account_id)
        if not acc:
            return self.failure("Account not found")
        if not isinstance(patch, dict):
            return self.failure("Invalid body")

        raw = dict(acc.settings) if isinstance(acc.settings, dict) else {}
        org = merged_organization_config(raw)

        if "name" in patch:
            name = patch.get("name")
            if not isinstance(name, str) or not name.strip():
                return self.failure("Company name cannot be empty")
            acc.name = name.strip()

        block = patch.get("organization")
        if isinstance(block, dict):
            for k, v in block.items():
                if k not in _ALLOW_PATCH_ORG_KEYS:
                    continue
                if k == "departments":
                    if v is None:
                        _sync_departments_table(self.db, account_id, [])
                    else:
                        _sync_departments_table(self.db, account_id, _normalize_departments(v))
                    continue
                if v is None:
                    org[k] = deepcopy(_DEFAULT_ORGANIZATION[k])
                    continue
                if k == "enabled_country_codes":
                    org[k] = _normalize_enabled_codes(v)
                elif k in ("logo_url", "careers_page_url"):
                    org[k] = str(v).strip()
                elif k == "default_language":
                    org[k] = str(v).strip().lower()[:16] or "en"
                elif k == "default_currency":
                    cur = str(v).strip().upper()[:8]
                    org[k] = cur or "USD"
                elif k == "timezone":
                    tz = str(v).strip()
                    if not tz:
                        return self.failure("Timezone cannot be empty")
                    try:
                        ZoneInfo(tz)
                    except ZoneInfoNotFoundError:
                        return self.failure(f"Unknown timezone: {tz}")
                    org[k] = tz

        org.pop("departments", None)
        raw["organization"] = {key: val for key, val in org.items() if key != "departments"}
        acc.settings = raw
        flag_modified(acc, "settings")
        acc.save(self.db)

        org_response = merged_organization_config(acc.settings if isinstance(acc.settings, dict) else {})
        org_response["departments"] = _departments_for_api(self.db, account_id)
        return self.success(
            {
                "name": acc.name,
                "slug": acc.slug,
                "plan": acc.plan,
                **org_response,
            }
        )
