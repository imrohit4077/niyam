"""Load ISO country list from config/countries.yml (REST Countries–style)."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import yaml


@lru_cache
def load_countries() -> list[dict[str, str]]:
    root = Path(__file__).resolve().parents[2]
    path = root / "config" / "countries.yml"
    with open(path, encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    rows = data.get("countries") or []
    out: list[dict[str, str]] = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        code = str(row.get("code") or "").strip().upper()
        name = str(row.get("name") or "").strip()
        if code and name:
            out.append({"code": code, "name": name})
    return sorted(out, key=lambda x: x["name"])


def valid_country_codes() -> frozenset[str]:
    return frozenset(c["code"] for c in load_countries())
