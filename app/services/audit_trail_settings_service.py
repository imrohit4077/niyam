"""Account-level preferences for what the audit trail records (mutations vs sensitive GET vs all GET)."""

from __future__ import annotations

from copy import deepcopy
from typing import Any

from app.models.account import Account
from app.services.audit_enrichment_service import merge_account_audit_prefs
from app.services.base_service import BaseService


_BOOL_KEYS = frozenset(
    {
        "track_mutations",
        "track_sensitive_reads",
        "track_all_reads",
        "track_read_requests",  # legacy alias → track_all_reads
    }
)


class AuditTrailSettingsService(BaseService):
    def update(self, account_id: int, patch: dict[str, Any]) -> dict[str, Any]:
        acc = Account.find_by(self.db, id=account_id)
        if not acc:
            return self.failure("Account not found")
        if not isinstance(patch, dict):
            return self.failure("Invalid body")

        raw = deepcopy(acc.settings) if isinstance(acc.settings, dict) else {}
        at = dict(raw.get("audit_trail") or {}) if isinstance(raw.get("audit_trail"), dict) else {}

        for key in _BOOL_KEYS:
            if key not in patch:
                continue
            v = patch[key]
            if not isinstance(v, bool):
                continue
            if key == "track_read_requests":
                at["track_all_reads"] = v
            else:
                at[key] = v

        raw["audit_trail"] = at
        acc.settings = raw
        acc.save(self.db)

        merged = merge_account_audit_prefs(acc)
        return self.success(merged)
