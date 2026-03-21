"""Workspace organization settings (accounts.name + accounts.settings['organization'])."""
from __future__ import annotations

from copy import deepcopy
from typing import Any

from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.models.account import Account
from app.services.base_service import BaseService

_DEFAULT_ORGANIZATION: dict[str, Any] = {
    "logo_url": "",
    "careers_page_url": "",
    "default_language": "en",
    "default_currency": "USD",
    "timezone": "UTC",
}

_ALLOWED_ORG_KEYS = frozenset(_DEFAULT_ORGANIZATION.keys())


def merged_organization_config(account_settings: dict | None) -> dict[str, Any]:
    org = deepcopy(_DEFAULT_ORGANIZATION)
    if isinstance(account_settings, dict) and isinstance(account_settings.get("organization"), dict):
        for k, v in account_settings["organization"].items():
            if k in _ALLOWED_ORG_KEYS and v is not None:
                org[k] = str(v).strip() if isinstance(v, str) else v
    return org


class OrganizationSettingsService(BaseService):
    def get_settings(self, account_id: int) -> dict:
        acc = Account.find_by(self.db, id=account_id)
        if not acc:
            return self.failure("Account not found")
        org = merged_organization_config(acc.settings if isinstance(acc.settings, dict) else {})
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
                if k not in _ALLOWED_ORG_KEYS:
                    continue
                if v is None:
                    org[k] = _DEFAULT_ORGANIZATION[k]
                    continue
                if k in ("logo_url", "careers_page_url"):
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

        raw["organization"] = org
        acc.settings = raw
        acc.save(self.db)

        return self.success(
            {
                "name": acc.name,
                "slug": acc.slug,
                "plan": acc.plan,
                **org,
            }
        )
