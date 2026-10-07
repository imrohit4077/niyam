"""Account UI typography (accounts.settings['appearance'])."""
from __future__ import annotations

from typing import Any

from app.models.account import Account
from app.services.base_service import BaseService

# Preset id -> safe CSS font-family stack (first family must match a loaded Google Font when applicable)
FONT_PRESETS: dict[str, str] = {
    "iosevka_charon_mono": "'Iosevka Charon Mono', ui-monospace, 'Cascadia Code', monospace",
    "plus_jakarta_sans": "'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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

DEFAULT_FONT_PRESET = "inter"
DEFAULT_HEADING_FONT_PRESET = "plus_jakarta_sans"
DEFAULT_MONO_FONT_PRESET = "jetbrains_mono"
DEFAULT_FONT_SIZE_PX = 14
MIN_FONT_SIZE = 12
MAX_FONT_SIZE = 22
DEFAULT_LINE_HEIGHT = 1.55
DEFAULT_LETTER_SPACING_EM = 0.0
DEFAULT_FONT_SCALE_PRESET = "comfortable"
DEFAULT_WEIGHT_REGULAR = 400
DEFAULT_WEIGHT_MEDIUM = 500
DEFAULT_WEIGHT_BOLD = 700
SCALE_PRESETS = frozenset({"compact", "comfortable", "spacious"})
MIN_LINE_HEIGHT = 1.2
MAX_LINE_HEIGHT = 2.0
MIN_LETTER_SPACING_EM = -0.02
MAX_LETTER_SPACING_EM = 0.08
WEIGHT_OPTIONS = frozenset({300, 400, 500, 600, 700, 800})


def _to_int(raw: Any, fallback: int) -> int:
    try:
        return int(raw)
    except (TypeError, ValueError):
        return fallback


def _to_float(raw: Any, fallback: float) -> float:
    try:
        return float(raw)
    except (TypeError, ValueError):
        return fallback


def merged_appearance(account_settings: dict | None) -> dict[str, Any]:
    preset = DEFAULT_FONT_PRESET
    heading_preset = DEFAULT_HEADING_FONT_PRESET
    body_preset = DEFAULT_FONT_PRESET
    mono_preset = DEFAULT_MONO_FONT_PRESET
    ui_preset = DEFAULT_FONT_PRESET
    content_preset = DEFAULT_FONT_PRESET
    size = DEFAULT_FONT_SIZE_PX
    line_height = DEFAULT_LINE_HEIGHT
    letter_spacing_em = DEFAULT_LETTER_SPACING_EM
    scale_preset = DEFAULT_FONT_SCALE_PRESET
    weight_regular = DEFAULT_WEIGHT_REGULAR
    weight_medium = DEFAULT_WEIGHT_MEDIUM
    weight_bold = DEFAULT_WEIGHT_BOLD
    readability_mode = False
    high_contrast_mode = False
    if isinstance(account_settings, dict) and isinstance(account_settings.get("appearance"), dict):
        ap = account_settings["appearance"]
        p = ap.get("font_preset")
        if isinstance(p, str) and p in FONT_PRESETS:
            preset = p
        hp = ap.get("heading_font_preset")
        if isinstance(hp, str) and hp in FONT_PRESETS:
            heading_preset = hp
        bp = ap.get("body_font_preset")
        if isinstance(bp, str) and bp in FONT_PRESETS:
            body_preset = bp
        mp = ap.get("mono_font_preset")
        if isinstance(mp, str) and mp in FONT_PRESETS:
            mono_preset = mp
        up = ap.get("ui_font_preset")
        if isinstance(up, str) and up in FONT_PRESETS:
            ui_preset = up
        cp = ap.get("content_font_preset")
        if isinstance(cp, str) and cp in FONT_PRESETS:
            content_preset = cp
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
        lh = _to_float(ap.get("line_height"), DEFAULT_LINE_HEIGHT)
        if MIN_LINE_HEIGHT <= lh <= MAX_LINE_HEIGHT:
            line_height = lh
        ls = _to_float(ap.get("letter_spacing_em"), DEFAULT_LETTER_SPACING_EM)
        if MIN_LETTER_SPACING_EM <= ls <= MAX_LETTER_SPACING_EM:
            letter_spacing_em = ls
        sp = ap.get("font_scale_preset")
        if isinstance(sp, str) and sp in SCALE_PRESETS:
            scale_preset = sp
        wr = _to_int(ap.get("weight_regular"), DEFAULT_WEIGHT_REGULAR)
        wm = _to_int(ap.get("weight_medium"), DEFAULT_WEIGHT_MEDIUM)
        wb = _to_int(ap.get("weight_bold"), DEFAULT_WEIGHT_BOLD)
        if wr in WEIGHT_OPTIONS:
            weight_regular = wr
        if wm in WEIGHT_OPTIONS:
            weight_medium = wm
        if wb in WEIGHT_OPTIONS:
            weight_bold = wb
        readability_mode = bool(ap.get("readability_mode"))
        high_contrast_mode = bool(ap.get("high_contrast_mode"))
    return {
        "font_preset": preset,
        "font_family_css": FONT_PRESETS[preset],
        "heading_font_preset": heading_preset,
        "heading_font_family_css": FONT_PRESETS[heading_preset],
        "body_font_preset": body_preset,
        "body_font_family_css": FONT_PRESETS[body_preset],
        "mono_font_preset": mono_preset,
        "mono_font_family_css": FONT_PRESETS[mono_preset],
        "ui_font_preset": ui_preset,
        "ui_font_family_css": FONT_PRESETS[ui_preset],
        "content_font_preset": content_preset,
        "content_font_family_css": FONT_PRESETS[content_preset],
        "font_size_px": size,
        "line_height": line_height,
        "letter_spacing_em": letter_spacing_em,
        "font_scale_preset": scale_preset,
        "weight_regular": weight_regular,
        "weight_medium": weight_medium,
        "weight_bold": weight_bold,
        "readability_mode": readability_mode,
        "high_contrast_mode": high_contrast_mode,
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

        for key in (
            "heading_font_preset",
            "body_font_preset",
            "mono_font_preset",
            "ui_font_preset",
            "content_font_preset",
        ):
            if key in patch:
                p = patch.get(key)
                if not isinstance(p, str) or p not in FONT_PRESETS:
                    return self.failure(f"Invalid {key}")
                cur[key] = p
                cur[key.replace("_preset", "_family_css")] = FONT_PRESETS[p]

        if "font_size_px" in patch:
            try:
                n = int(patch.get("font_size_px"))
            except (TypeError, ValueError):
                return self.failure("font_size_px must be a number")
            if n < MIN_FONT_SIZE or n > MAX_FONT_SIZE:
                return self.failure(f"font_size_px must be between {MIN_FONT_SIZE} and {MAX_FONT_SIZE}")
            cur["font_size_px"] = n

        if "line_height" in patch:
            n = _to_float(patch.get("line_height"), -1)
            if n < MIN_LINE_HEIGHT or n > MAX_LINE_HEIGHT:
                return self.failure(f"line_height must be between {MIN_LINE_HEIGHT} and {MAX_LINE_HEIGHT}")
            cur["line_height"] = round(n, 2)

        if "letter_spacing_em" in patch:
            n = _to_float(patch.get("letter_spacing_em"), -999)
            if n < MIN_LETTER_SPACING_EM or n > MAX_LETTER_SPACING_EM:
                return self.failure(
                    f"letter_spacing_em must be between {MIN_LETTER_SPACING_EM} and {MAX_LETTER_SPACING_EM}"
                )
            cur["letter_spacing_em"] = round(n, 3)

        if "font_scale_preset" in patch:
            p = patch.get("font_scale_preset")
            if not isinstance(p, str) or p not in SCALE_PRESETS:
                return self.failure("Invalid font_scale_preset")
            cur["font_scale_preset"] = p

        for key in ("weight_regular", "weight_medium", "weight_bold"):
            if key in patch:
                n = _to_int(patch.get(key), -1)
                if n not in WEIGHT_OPTIONS:
                    return self.failure(f"{key} must be one of: {', '.join(str(v) for v in sorted(WEIGHT_OPTIONS))}")
                cur[key] = n

        if "readability_mode" in patch:
            cur["readability_mode"] = bool(patch.get("readability_mode"))
        if "high_contrast_mode" in patch:
            cur["high_contrast_mode"] = bool(patch.get("high_contrast_mode"))

        raw["appearance"] = {
            "font_preset": cur["font_preset"],
            "font_size_px": cur["font_size_px"],
            "heading_font_preset": cur["heading_font_preset"],
            "body_font_preset": cur["body_font_preset"],
            "mono_font_preset": cur["mono_font_preset"],
            "ui_font_preset": cur["ui_font_preset"],
            "content_font_preset": cur["content_font_preset"],
            "line_height": cur["line_height"],
            "letter_spacing_em": cur["letter_spacing_em"],
            "font_scale_preset": cur["font_scale_preset"],
            "weight_regular": cur["weight_regular"],
            "weight_medium": cur["weight_medium"],
            "weight_bold": cur["weight_bold"],
            "readability_mode": cur["readability_mode"],
            "high_contrast_mode": cur["high_contrast_mode"],
        }
        acc.settings = raw
        acc.save(self.db)

        return self.success(cur)
