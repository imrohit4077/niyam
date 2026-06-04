"""Insights (Metabase) dashboard allowlist per workspace — stored in account_kv_settings."""

from __future__ import annotations

from typing import Any

from app.models.account_kv_setting import AccountKvSetting
from app.services.base_service import BaseService

INSIGHTS_CONFIGURATION_KEY = "insights_configuration"


def _normalize_dashboards(raw: Any) -> tuple[list[dict[str, Any]], str | None]:
    if raw is None:
        return [], None
    if not isinstance(raw, list):
        return [], "insights_dashboards must be a list"
    out: list[dict[str, Any]] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        try:
            did = int(item.get("id"))
        except (TypeError, ValueError):
            return [], "Each dashboard must have a numeric id"
        name = item.get("name")
        if not isinstance(name, str) or not name.strip():
            return [], "Each dashboard must have a non-empty name"
        out.append({"id": did, "name": name.strip()[:255]})
    ids = [d["id"] for d in out]
    if len(ids) != len(set(ids)):
        return [], "Duplicate dashboard ids are not allowed"
    return out, None


class InsightsSettingsService(BaseService):
    def get_settings(self, account_id: int) -> dict:
        row = AccountKvSetting.find_by(self.db, account_id=account_id, key=INSIGHTS_CONFIGURATION_KEY)
        if not row or not isinstance(row.value, dict):
            return self.success({"insights_dashboards": []})
        raw_list = row.value.get("insights_dashboards")
        if raw_list is None:
            return self.success({"insights_dashboards": []})
        if not isinstance(raw_list, list):
            return self.success({"insights_dashboards": []})
        norm, err = _normalize_dashboards(raw_list)
        if err:
            return self.success({"insights_dashboards": []})
        return self.success({"insights_dashboards": norm})

    def update_settings(self, account_id: int, data: dict) -> dict:
        dashboards, err = _normalize_dashboards(data.get("insights_dashboards"))
        if err:
            return self.failure(err)
        value = {"insights_dashboards": dashboards}
        row = AccountKvSetting.find_by(self.db, account_id=account_id, key=INSIGHTS_CONFIGURATION_KEY)
        if row:
            row.update(self.db, value=value)
        else:
            AccountKvSetting.create(self.db, account_id=account_id, key=INSIGHTS_CONFIGURATION_KEY, value=value)
        return self.success({"insights_dashboards": dashboards})

    def allowed_dashboard_ids(self, account_id: int) -> set[int]:
        r = self.get_settings(account_id)
        if not r["ok"]:
            return set()
        rows = r["data"].get("insights_dashboards") or []
        return {int(x["id"]) for x in rows if isinstance(x.get("id"), int)}
