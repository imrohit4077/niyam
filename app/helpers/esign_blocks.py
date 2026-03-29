"""ATS-style block JSON → HTML for e-sign merge fields ({candidate_name}, …)."""
from __future__ import annotations

import html
import re
import uuid
from typing import Any

_MAX_BLOCKS = 80
_SAFE_HTTP_RE = re.compile(r"^https?://[^\s]+$", re.I)
_DATA_IMG_RE = re.compile(
    r"^data:image/(png|jpeg|jpg|gif|webp);base64,[a-z0-9+/=\s]+$",
    re.I,
)


def _esc(s: str) -> str:
    return html.escape(s or "", quote=False)


def _align_style(align: str) -> str:
    a = (align or "left").lower()
    if a not in ("left", "center", "right"):
        a = "left"
    return f"text-align:{a};"


def _clamp_int(v: Any, default: int, lo: int, hi: int) -> int:
    try:
        n = int(v)
    except (TypeError, ValueError):
        return default
    return max(lo, min(n, hi))


def _sanitize_img_src(src: str) -> str:
    s = (src or "").strip()
    if not s:
        return ""
    if _SAFE_HTTP_RE.match(s) and len(s) < 8_000:
        return s
    compact = re.sub(r"\s+", "", s)
    if _DATA_IMG_RE.match(compact) and len(compact) < 2_000_000:
        return compact
    return ""


def _sanitize_href(href: str) -> str:
    h = (href or "").strip()
    if not h or h == "#":
        return "#"
    if _SAFE_HTTP_RE.match(h) and len(h) < 8_000:
        return h
    return "#"


def _hex_color(c: Any) -> str:
    s = str(c or "").strip()
    if re.match(r"^#[0-9a-fA-F]{3}$", s) or re.match(r"^#[0-9a-fA-F]{6}$", s):
        return s
    return "#111827"


def _font_weight_css(fw: str) -> str:
    m = {"normal": "400", "medium": "500", "semibold": "600", "bold": "700"}
    return m.get((fw or "normal").lower(), "400")


def _format_multiline_paragraphs(
    content: str,
    *,
    font_size: int,
    color: str,
    align: str,
    font_weight: str = "400",
) -> str:
    text = (content or "").replace("\r\n", "\n")
    chunks = re.split(r"\n\s*\n", text)
    if not chunks:
        chunks = [""]
    parts: list[str] = []
    c = _esc(_hex_color(color))
    fs = font_size
    al = _align_style(align)
    fwc = _esc(font_weight)
    for ch in chunks:
        lines = ch.split("\n")
        inner = "<br/>".join(_esc(line) for line in lines)
        parts.append(
            f'<p style="margin:0 0 0.65em 0;font-size:{fs}px;color:{c};font-weight:{fwc};{al}">{inner}</p>'
        )
    return "".join(parts)


def block_to_html(block: dict[str, Any]) -> str:
    t = block.get("type")
    if t == "text":
        fs = _clamp_int(block.get("fontSize"), 15, 10, 36)
        color = _hex_color(block.get("color"))
        align = str(block.get("align") or "left")
        fw_raw = str(block.get("fontWeight") or "normal")
        fw = _font_weight_css(fw_raw)
        inner = _format_multiline_paragraphs(
            str(block.get("content") or ""),
            font_size=fs,
            color=color,
            align=align,
            font_weight=fw,
        )
        return f'<div class="atsb-text">{inner}</div>'

    if t == "image":
        src = _sanitize_img_src(str(block.get("src") or ""))
        alt = _esc(str(block.get("alt") or ""))
        wp = _clamp_int(block.get("widthPct"), 100, 20, 100)
        if not src:
            return (
                '<div class="atsb-image atsb-image--empty" style="padding:12px;border:1px dashed #d1d5db;'
                'border-radius:8px;color:#9ca3af;font-size:13px;text-align:center;">Image (add URL)</div>'
            )
        esc_src = _esc(src)
        return (
            f'<div class="atsb-image" style="text-align:center;margin:14px 0;">'
            f'<img src="{esc_src}" alt="{alt}" style="max-width:{wp}%;height:auto;border-radius:4px;"/>'
            f"</div>"
        )

    if t == "section":
        title = _esc(str(block.get("title") or ""))
        inner = _format_multiline_paragraphs(
            str(block.get("content") or ""),
            font_size=_clamp_int(block.get("bodyFontSize"), 14, 10, 22),
            color=_hex_color(block.get("bodyColor") or "#374151"),
            align=str(block.get("bodyAlign") or "left"),
        )
        head = (
            f'<h3 style="margin:0 0 10px;font-size:15px;font-weight:700;color:#0f172a;">{title}</h3>'
            if title
            else ""
        )
        variant = str(block.get("variant") or "card").lower()
        if variant not in ("card", "minimal", "highlight"):
            variant = "card"
        if variant == "minimal":
            return (
                f'<div class="atsb-section atsb-section--minimal" style="margin:14px 0;padding:6px 0;">'
                f"{head}{inner}</div>"
            )
        if variant == "highlight":
            return (
                f'<div class="atsb-section atsb-section--highlight" style="border-left:4px solid #0891b2;'
                f"padding:16px 20px;margin:16px 0;background:#f0fdfa;border-radius:0 12px 12px 0;"
                f'box-shadow:0 1px 2px rgba(15,23,42,0.04);">{head}{inner}</div>'
            )
        return (
            f'<div class="atsb-section" style="border:1px solid #e5e7eb;border-radius:10px;'
            f"padding:16px 18px;margin:16px 0;background:#fafafa;\">{head}{inner}</div>"
        )

    if t == "button":
        label = _esc(str(block.get("label") or "Continue"))
        href = _sanitize_href(str(block.get("href") or "#"))
        esc_href = _esc(href)
        align = str(block.get("align") or "center")
        al = _align_style(align)
        bg = _hex_color(block.get("bgColor") or "#0284c7")
        fg = _hex_color(block.get("textColor") or "#ffffff")
        rad = _clamp_int(block.get("borderRadius"), 8, 0, 24)
        return (
            f'<div class="atsb-btn-wrap" style="margin:16px 0;{al}">'
            f'<a href="{esc_href}" style="display:inline-block;padding:10px 22px;background:{bg};'
            f"color:{fg};text-decoration:none;border-radius:{rad}px;font-weight:600;font-size:14px;"
            f'font-family:system-ui,sans-serif;">{label}</a></div>'
        )

    if t == "divider":
        st = str(block.get("style") or "solid").lower()
        if st not in ("solid", "dashed", "subtle"):
            st = "solid"
        if st == "dashed":
            return (
                '<div class="atsb-divider" style="margin:20px 0;height:0;border:none;'
                'border-top:1px dashed #cbd5e1;"></div>'
            )
        if st == "subtle":
            return (
                '<div class="atsb-divider atsb-divider--subtle" style="margin:22px 0;height:1px;'
                'background:linear-gradient(90deg,transparent,rgba(148,163,184,0.55),transparent);'
                'border:none;"></div>'
            )
        return (
            '<div class="atsb-divider" style="margin:20px 0;height:0;border:none;'
            'border-top:1px solid #e5e7eb;"></div>'
        )

    if t == "spacer":
        h = _clamp_int(block.get("height"), 24, 8, 120)
        return f'<div class="atsb-spacer" style="height:{h}px;" aria-hidden="true"></div>'

    return ""


def document_to_html(doc: dict[str, Any]) -> str:
    if not isinstance(doc, dict):
        raise ValueError("content_blocks must be an object")
    blocks = doc.get("blocks")
    if not isinstance(blocks, list):
        raise ValueError("content_blocks.blocks must be an array")
    if len(blocks) > _MAX_BLOCKS:
        raise ValueError(f"At most {_MAX_BLOCKS} blocks allowed")
    parts: list[str] = []
    for b in blocks:
        if isinstance(b, dict):
            parts.append(block_to_html(b))
    inner = "".join(parts)
    wrap = (
        '<div class="ats-doc" style="font-family:system-ui,-apple-system,BlinkMacSystemFont,sans-serif;'
        'line-height:1.55;color:#1a1a1a;max-width:680px;">'
    )
    return wrap + inner + "</div>"


def normalize_document(raw: dict[str, Any]) -> dict[str, Any]:
    """Validate shape; drop unknown keys; keep merge placeholders in text as-is."""
    if not isinstance(raw, dict):
        raise ValueError("content_blocks must be an object")
    ver = raw.get("version", 1)
    if ver != 1:
        raise ValueError("Unsupported content_blocks.version")
    blocks_in = raw.get("blocks")
    if not isinstance(blocks_in, list):
        raise ValueError("content_blocks.blocks must be an array")
    if len(blocks_in) > _MAX_BLOCKS:
        raise ValueError(f"At most {_MAX_BLOCKS} blocks allowed")
    out_blocks: list[dict[str, Any]] = []
    for b in blocks_in:
        if not isinstance(b, dict):
            continue
        bid = str(b.get("id") or "")[:120]
        t = b.get("type")
        if t == "text":
            fw = str(b.get("fontWeight") or "normal").lower()
            if fw not in ("normal", "medium", "semibold", "bold"):
                fw = "normal"
            out_blocks.append(
                {
                    "id": bid or None,
                    "type": "text",
                    "content": str(b.get("content") or ""),
                    "fontSize": _clamp_int(b.get("fontSize"), 15, 10, 36),
                    "color": _hex_color(b.get("color")),
                    "align": str(b.get("align") or "left").lower()
                    if str(b.get("align") or "left").lower() in ("left", "center", "right")
                    else "left",
                    "fontWeight": fw,
                }
            )
        elif t == "image":
            out_blocks.append(
                {
                    "id": bid or None,
                    "type": "image",
                    "src": str(b.get("src") or "")[:8000],
                    "alt": str(b.get("alt") or "")[:500],
                    "widthPct": _clamp_int(b.get("widthPct"), 100, 20, 100),
                }
            )
        elif t == "section":
            sv = str(b.get("variant") or "card").lower()
            if sv not in ("card", "minimal", "highlight"):
                sv = "card"
            out_blocks.append(
                {
                    "id": bid or None,
                    "type": "section",
                    "title": str(b.get("title") or "")[:500],
                    "content": str(b.get("content") or "")[:50_000],
                    "bodyFontSize": _clamp_int(b.get("bodyFontSize"), 14, 10, 22),
                    "bodyColor": _hex_color(b.get("bodyColor") or "#374151"),
                    "bodyAlign": str(b.get("bodyAlign") or "left").lower()
                    if str(b.get("bodyAlign") or "left").lower() in ("left", "center", "right")
                    else "left",
                    "variant": sv,
                }
            )
        elif t == "button":
            out_blocks.append(
                {
                    "id": bid or None,
                    "type": "button",
                    "label": str(b.get("label") or "Button")[:200],
                    "href": str(b.get("href") or "#")[:8000],
                    "align": str(b.get("align") or "center").lower()
                    if str(b.get("align") or "center").lower() in ("left", "center", "right")
                    else "center",
                    "bgColor": _hex_color(b.get("bgColor") or "#0284c7"),
                    "textColor": _hex_color(b.get("textColor") or "#ffffff"),
                    "borderRadius": _clamp_int(b.get("borderRadius"), 8, 0, 24),
                }
            )
        elif t == "divider":
            ds = str(b.get("style") or "solid").lower()
            if ds not in ("solid", "dashed", "subtle"):
                ds = "solid"
            out_blocks.append(
                {
                    "id": bid or None,
                    "type": "divider",
                    "style": ds,
                }
            )
        elif t == "spacer":
            out_blocks.append(
                {
                    "id": bid or None,
                    "type": "spacer",
                    "height": _clamp_int(b.get("height"), 24, 8, 120),
                }
            )
    for ob in out_blocks:
        if not ob.get("id"):
            ob["id"] = str(uuid.uuid4())
    return {"version": 1, "blocks": out_blocks}
