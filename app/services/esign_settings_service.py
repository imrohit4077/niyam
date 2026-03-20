"""Account-level e-sign integration settings (stored in accounts.settings JSON)."""
from __future__ import annotations

from copy import deepcopy
from typing import Any

from app.models.account import Account
from app.services.base_service import BaseService

_DEFAULT_ESIGN: dict[str, Any] = {
    "webhook_secret": "",
    "frontend_base_url": "",
    "field_map": {},
}


def merged_esign_config(account_settings: dict | None) -> dict[str, Any]:
    """Merge account.settings['esign'] with defaults. Signing is internal (in-app) only."""
    esign = deepcopy(_DEFAULT_ESIGN)
    if isinstance(account_settings, dict) and isinstance(account_settings.get("esign"), dict):
        raw = dict(account_settings["esign"])
        raw.pop("provider", None)
        esign.update(raw)
    return esign


class EsignSettingsService(BaseService):
    def get_settings(self, account_id: int) -> dict:
        acc = Account.find_by(self.db, id=account_id)
        if not acc:
            return self.failure("Account not found")
        esign = merged_esign_config(acc.settings if isinstance(acc.settings, dict) else {})
        return self.success({**esign, "provider": "internal"})

    def update_settings(self, account_id: int, patch: dict) -> dict:
        acc = Account.find_by(self.db, id=account_id)
        if not acc:
            return self.failure("Account not found")
        raw = dict(acc.settings) if isinstance(acc.settings, dict) else {}
        cur = deepcopy(_DEFAULT_ESIGN)
        if isinstance(raw.get("esign"), dict):
            cur.update(raw["esign"])
        cur.pop("provider", None)
        allowed = {"webhook_secret", "frontend_base_url", "field_map"}
        for k, v in (patch or {}).items():
            if k not in allowed:
                continue
            if k == "field_map" and v is not None:
                if not isinstance(v, dict):
                    return self.failure("field_map must be an object")
                cur["field_map"] = {str(a): str(b) for a, b in v.items()}
            elif v is not None:
                cur[k] = str(v).strip() if isinstance(v, str) else v
        raw["esign"] = cur
        acc.settings = raw
        acc.save(self.db)
        return self.success({**cur, "provider": "internal"})
