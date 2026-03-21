"""Account UI typography (accounts.settings['appearance'])."""
from __future__ import annotations

from copy import deepcopy
from typing import Any

from app.models.account import Account
from app.services.base_service import BaseService

# Preset id -> safe CSS font-family stack (first family must match a loaded Google Font when applicable)
FONT_PRESETS: dict[str, str] = {
    "iosevka_charon_mono": "'Iosevka Charon Mono', ui-monospace, 'Cascadia Code', monospace",
    "jetbrains_mono": "'JetBrains Mono', ui-monospace, 'Cascadia Code', monospace",
    "source_code_pro": "'Source Code Pro', ui-monospace, 'Cascadia Code', monospace",
    "inter": "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    "roboto": "'Roboto', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    "open_sans": "'Open Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    "lato": "'Lato', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    "source_sans_3": "'Source Sans 3', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    "ibm_plex_sans": "'IBM Plex Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    "system_ui": "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    "georgia": "Georgia, 'Times New Roman', Times, serif",
    "merriweather": "'Merriweather', Georgia, 'Times New Roman', serif",
}

DEFAULT_FONT_PRESET = "iosevka_charon_mono"
DEFAULT_FONT_SIZE_PX = 15
MIN_FONT_SIZE = 12
MAX_FONT_SIZE = 22


def merged_appearance(account_settings: dict | None) -> dict[str, Any]:
    preset = DEFAULT_FONT_PRESET
    size = DEFAULT_FONT_SIZE_PX
    if isinstance(account_settings, dict) and isinstance(account_settings.get("appearance"), dict):
        ap = account_settings["appearance"]
        p = ap.get("font_preset")
        if isinstance(p, str) and p in FONT_PRESETS:
            preset = p
        sz = ap.get("font_size_px")
        if isinstance(sz, int) and MIN_FONT_SIZE <= sz <= MAX_FONT_SIZE:
            size = sz
        elif isinstance(sz, (float, str)):
            try:
                n = int(float(sz))
                if MIN_FONT_SIZE <= n <= MAX_FONT_SIZE:
                    size = n
            except (TypeError, ValueError):
                pass
    return {
        "font_preset": preset,
        "font_family_css": FONT_PRESETS[preset],
        "font_size_px": size,
    }


class AppearanceSettingsService(BaseService):
    def get_settings(self, account_id: int) -> dict:
        acc = Account.find_by(self.db, id=account_id)
        if not acc:
            return self.failure("Account not found")
        return self.success(merged_appearance(acc.settings if isinstance(acc.settings, dict) else {}))

    def update_settings(self, account_id: int, patch: dict) -> dict:
        acc = Account.find_by(self.db, id=account_id)
        if not acc:
            return self.failure("Account not found")
        if not isinstance(patch, dict):
            return self.failure("Invalid body")

        raw = dict(acc.settings) if isinstance(acc.settings, dict) else {}
        cur = merged_appearance(raw)

        if "font_preset" in patch:
            p = patch.get("font_preset")
            if not isinstance(p, str) or p not in FONT_PRESETS:
                return self.failure("Invalid font_preset")
            cur["font_preset"] = p
            cur["font_family_css"] = FONT_PRESETS[p]

        if "font_size_px" in patch:
            try:
                n = int(patch.get("font_size_px"))
            except (TypeError, ValueError):
                return self.failure("font_size_px must be a number")
            if n < MIN_FONT_SIZE or n > MAX_FONT_SIZE:
                return self.failure(f"font_size_px must be between {MIN_FONT_SIZE} and {MAX_FONT_SIZE}")
            cur["font_size_px"] = n

        raw["appearance"] = {
            "font_preset": cur["font_preset"],
            "font_size_px": cur["font_size_px"],
        }
        acc.settings = raw
        acc.save(self.db)

        return self.success(cur)
