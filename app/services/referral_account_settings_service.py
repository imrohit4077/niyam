"""Account-level referral program settings (stored under accounts.settings['referral'])."""
from __future__ import annotations

from copy import deepcopy
from typing import Any

from app.models.account import Account
from app.services.base_service import BaseService

_DEFAULT_REFERRAL: dict[str, Any] = {
    "enabled": True,
    "public_apply_base_url": "",
    "notify_referrer_milestones": True,
    "hris_webhook_url": "",
    "hris_webhook_secret": "",
}

_ALLOWED = frozenset(_DEFAULT_REFERRAL.keys())


def merged_referral_settings(account_settings: dict | None) -> dict[str, Any]:
    out = deepcopy(_DEFAULT_REFERRAL)
    raw = account_settings if isinstance(account_settings, dict) else {}
    block = raw.get("referral")
    if isinstance(block, dict):
        for k, v in block.items():
            if k in _ALLOWED and v is not None:
                out[k] = v
    return out


class ReferralAccountSettingsService(BaseService):
    def get_settings(self, account_id: int) -> dict:
        acc = Account.find_by(self.db, id=account_id)
        if not acc:
            return self.failure("Account not found")
        merged = merged_referral_settings(acc.settings if isinstance(acc.settings, dict) else {})
        return self.success(merged)

    def update_settings(self, account_id: int, patch: dict) -> dict:
        acc = Account.find_by(self.db, id=account_id)
        if not acc:
            return self.failure("Account not found")
        if not isinstance(patch, dict):
            return self.failure("Invalid body")
        raw = dict(acc.settings) if isinstance(acc.settings, dict) else {}
        ref = merged_referral_settings(raw)

        for k, v in patch.items():
            if k not in _ALLOWED:
                continue
            if v is None:
                ref[k] = _DEFAULT_REFERRAL[k]
                continue
            if k == "enabled":
                ref[k] = bool(v)
            elif k == "notify_referrer_milestones":
                ref[k] = bool(v)
            elif k in ("public_apply_base_url", "hris_webhook_url", "hris_webhook_secret"):
                ref[k] = str(v).strip()

        raw["referral"] = ref
        acc.settings = raw
        acc.save(self.db)
        return self.success(ref)
