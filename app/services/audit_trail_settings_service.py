"""Account-level preferences for what the audit trail records (GET vs mutations)."""

from __future__ import annotations

from copy import deepcopy
from typing import Any

from app.models.account import Account
from app.services.audit_enrichment_service import merge_account_audit_prefs
from app.services.base_service import BaseService


class AuditTrailSettingsService(BaseService):
    def update(self, account_id: int, patch: dict[str, Any]) -> dict[str, Any]:
        acc = Account.find_by(self.db, id=account_id)
        if not acc:
            return self.failure("Account not found")
        if not isinstance(patch, dict):
            return self.failure("Invalid body")

        raw = deepcopy(acc.settings) if isinstance(acc.settings, dict) else {}
        at = dict(raw.get("audit_trail") or {}) if isinstance(raw.get("audit_trail"), dict) else {}

        if "track_read_requests" in patch:
            v = patch["track_read_requests"]
            if isinstance(v, bool):
                at["track_read_requests"] = v
        if "track_mutations" in patch:
            v = patch["track_mutations"]
            if isinstance(v, bool):
                at["track_mutations"] = v

        raw["audit_trail"] = at
        acc.settings = raw
        acc.save(self.db)

        merged = merge_account_audit_prefs(acc)
        return self.success(merged)
