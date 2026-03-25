"""Candidate-facing signing flow (token in URL, no login)."""
from __future__ import annotations

import base64
import html as html_module
import re
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path

from app.models.application import Application
from app.models.esign_request import EsignRequest
from app.models.esign_template import EsignTemplate
from app.helpers.logger import get_logger
from app.services.base_service import BaseService
from config.settings import get_settings

logger = get_logger(__name__)


def _normalize_name(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().lower())


def _signed_documents_root() -> Path:
    raw = (get_settings().ESIGN_SIGNED_DOCUMENTS_DIR or "").strip()
    if raw:
        return Path(raw).expanduser().resolve()
    return Path(__file__).resolve().parents[2] / "storage" / "esign_signed"


def _decode_signature_png(data_url_or_b64: str) -> bytes:
    s = (data_url_or_b64 or "").strip()
    if not s:
        raise ValueError("Signature is required")
    if "base64," in s:
        s = s.split("base64,", 1)[-1].strip()
    try:
        data = base64.b64decode(s, validate=True)
    except Exception as exc:
        raise ValueError("Invalid signature image") from exc
    if len(data) > 4_000_000:
        raise ValueError("Signature image is too large")
    if not data.startswith(b"\x89PNG\r\n\x1a\n"):
        raise ValueError("Signature must be a PNG image")
    return data


def _build_signed_document_html_for_pdf(
    *,
    template_name: str | None,
    body_html: str,
    legal_name: str,
    signature_b64: str,
    signed_at_iso: str,
) -> str:
    """HTML tuned for WeasyPrint → A4 PDF (embedded PNG signature)."""
    safe_name = html_module.escape(legal_name)
    safe_title = html_module.escape(template_name or "Agreement")
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Signed — {safe_title}</title>
  <style>
    @page {{
      size: A4;
      margin: 16mm 14mm 18mm 14mm;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      font-family: Georgia, 'Times New Roman', serif;
      color: #111827;
      background: #fff;
      margin: 0;
      padding: 0;
      font-size: 11pt;
      line-height: 1.55;
    }}
    .doc-body {{
      font-size: 11pt;
      line-height: 1.6;
    }}
    .doc-body h1, .doc-body h2, .doc-body h3 {{
      font-family: Helvetica, Arial, sans-serif;
      font-weight: 700;
      color: #0f172a;
    }}
    .sign-block {{
      margin-top: 28pt;
      padding-top: 16pt;
      border-top: 1px solid #d1d5db;
      page-break-inside: avoid;
    }}
    .sign-block h2 {{
      font-family: Helvetica, Arial, sans-serif;
      font-size: 8pt;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #6b7280;
      margin: 0 0 10pt;
    }}
    .sig-img-wrap {{
      border: 1px solid #e5e7eb;
      padding: 6pt 10pt;
      display: inline-block;
      background: #fafafa;
    }}
    .sig-img-wrap img {{
      display: block;
      max-width: 240px;
      max-height: 100px;
    }}
    .legal-line {{
      font-family: Helvetica, Arial, sans-serif;
      font-size: 10.5pt;
      margin-top: 10pt;
      color: #374151;
    }}
    .audit {{
      font-family: Helvetica, Arial, sans-serif;
      font-size: 9pt;
      color: #6b7280;
      margin-top: 12pt;
      line-height: 1.45;
    }}
  </style>
</head>
<body>
  <div class="doc-body">{body_html}</div>
  <div class="sign-block">
    <h2>Electronic signature</h2>
    <div class="sig-img-wrap">
      <img src="data:image/png;base64,{signature_b64}" alt="Signature"/>
    </div>
    <p class="legal-line">Signed by <strong>{safe_name}</strong></p>
    <p class="audit">Electronically signed on {html_module.escape(signed_at_iso)} · Document: {safe_title}</p>
  </div>
</body>
</html>
"""


def _fpdf2_unicode_font_path() -> Path | None:
    """TTF with broad Unicode coverage when available (improves signer names / non-Latin body HTML)."""
    candidates = (
        Path("/System/Library/Fonts/Supplemental/Arial Unicode.ttf"),
        Path("/Library/Fonts/Arial Unicode.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
        Path("/usr/share/fonts/TTF/DejaVuSans.ttf"),
    )
    for p in candidates:
        if p.is_file():
            return p
    return None


def _html_to_pdf_bytes_fpdf2(html: str) -> bytes:
    """HTML → PDF via fpdf2 (no Pango/Cairo; weaker CSS than WeasyPrint)."""
    from fpdf import FPDF

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=14)
    ttf = _fpdf2_unicode_font_path()
    if ttf:
        p = str(ttf)
        # HTML bold/italic need matching faces; same file is OK for signed agreements.
        for style in ("", "B", "I", "BI"):
            pdf.add_font("EsignUnicode", style, p)
        pdf.set_font("EsignUnicode", size=11)
    else:
        pdf.set_font("Helvetica", size=11)
    pdf.add_page()
    pdf.write_html(html)
    out = BytesIO()
    pdf.output(out)
    data = out.getvalue()
    if not data or not data.startswith(b"%PDF"):
        raise RuntimeError("Fallback PDF engine produced invalid output")
    return data


def _html_to_pdf_bytes(html: str) -> bytes:
    """Prefer WeasyPrint; fall back to fpdf2 when GObject/Pango/Cairo are unavailable (common on macOS)."""

    weasy_exc: BaseException | None = None
    try:
        from weasyprint import HTML

        return HTML(string=html, base_url=None).write_pdf()
    except ImportError as exc:
        weasy_exc = exc
    except OSError as exc:
        # e.g. dlopen(libgobject-2.0-0) failed — brew install pango cairo gdk-pixbuf libffi, or use fpdf2 fallback
        weasy_exc = exc
    except Exception as exc:
        logger.warning("WeasyPrint failed; falling back to fpdf2: %s", exc)
        weasy_exc = exc

    try:
        return _html_to_pdf_bytes_fpdf2(html)
    except ImportError as exc:
        hint = "pip install -r requirements.txt"
        if weasy_exc is not None:
            raise RuntimeError(
                f"PDF output unavailable (WeasyPrint: {weasy_exc!s}; fpdf2 not importable). {hint}"
            ) from exc
        raise RuntimeError(f"PDF engine not available. {hint}") from exc
    except RuntimeError:
        raise
    except Exception as exc:
        if weasy_exc is not None:
            raise RuntimeError(
                "Could not generate PDF. Optional: install WeasyPrint native libs (see README: "
                "brew install pango cairo gdk-pixbuf libffi). The fpdf2 fallback also failed."
            ) from exc
        raise RuntimeError("Could not generate PDF.") from exc


class EsignPublicService(BaseService):
    def get_sign_page(self, token: str) -> dict:
        token = (token or "").strip()
        if not token:
            return self.failure("Invalid link")
        req = EsignRequest.find_by(self.db, candidate_sign_token=token)
        if not req:
            return self.failure("Document not found")
        if req.status in ("declined", "error"):
            return self.failure("This document is no longer available for signing")
        app = Application.find_by(self.db, id=req.application_id, account_id=req.account_id)
        if not app or app.deleted_at:
            return self.failure("Application not found")

        now = datetime.now(timezone.utc)
        if req.status == "sent" and req.viewed_at is None:
            req.viewed_at = now
            req.status = "viewed"
            req.updated_at = now
            ev = list(req.events or [])
            ev.append({"at": now.isoformat(), "type": "viewed"})
            req.events = ev
            req.save(self.db)

        tpl_name = None
        if req.template_id:
            tpl = EsignTemplate.find_by(self.db, id=req.template_id, account_id=req.account_id)
            if tpl:
                tpl_name = tpl.name

        meta = req.provider_metadata if isinstance(req.provider_metadata, dict) else {}
        signed_file = bool(meta.get("signed_pdf_saved") or meta.get("signed_html_saved"))

        return self.success(
            {
                "status": req.status,
                "template_name": tpl_name,
                "candidate_display_name": app.candidate_name or app.candidate_email,
                "html": req.rendered_html or "",
                "already_signed": req.status == "signed",
                "signed_at": req.signed_at.isoformat() if req.signed_at else None,
                "signer_legal_name": req.signer_legal_name,
                "signed_copy_available": req.status == "signed" and signed_file,
            }
        )

    def submit_signature(
        self,
        token: str,
        legal_name: str,
        confirm: bool,
        signature_image: str | None,
    ) -> dict:
        token = (token or "").strip()
        legal_name = (legal_name or "").strip()
        if not token:
            return self.failure("Invalid link")
        if not confirm:
            return self.failure("You must confirm to sign")
        if len(legal_name) < 2:
            return self.failure("Legal name is required")
        try:
            png_bytes = _decode_signature_png(signature_image or "")
        except ValueError as e:
            return self.failure(str(e))

        req = EsignRequest.find_by(self.db, candidate_sign_token=token)
        if not req:
            return self.failure("Document not found")
        if req.status == "signed":
            om = req.provider_metadata if isinstance(req.provider_metadata, dict) else {}
            return self.success(
                {
                    "status": "signed",
                    "message": "Already signed",
                    "signed_copy_available": bool(
                        om.get("signed_pdf_saved") or om.get("signed_html_saved")
                    ),
                }
            )
        if req.status not in ("sent", "viewed"):
            return self.failure("This document cannot be signed in its current state")

        app = Application.find_by(self.db, id=req.application_id, account_id=req.account_id)
        if not app or app.deleted_at:
            return self.failure("Application not found")

        expected = _normalize_name(app.candidate_name or "")
        provided = _normalize_name(legal_name)
        if expected and len(expected) >= 2 and expected not in provided and provided not in expected:
            return self.failure(
                "The legal name does not match the name on file for this application. "
                "Contact the employer if you need to correct your name."
            )

        now = datetime.now(timezone.utc)
        signed_iso = now.isoformat()
        sig_b64 = base64.b64encode(png_bytes).decode("ascii")

        tpl_name = None
        if req.template_id:
            tpl = EsignTemplate.find_by(self.db, id=req.template_id, account_id=req.account_id)
            if tpl:
                tpl_name = tpl.name

        package_html = _build_signed_document_html_for_pdf(
            template_name=tpl_name,
            body_html=req.rendered_html or "<p>(No document body)</p>",
            legal_name=legal_name,
            signature_b64=sig_b64,
            signed_at_iso=signed_iso,
        )
        try:
            pdf_bytes = _html_to_pdf_bytes(package_html)
        except RuntimeError as exc:
            return self.failure(str(exc))
        except Exception:
            logger.exception("PDF render failed for esign request %s", req.id)
            return self.failure(
                "Could not generate the signed PDF. If this persists, contact the employer."
            )

        root = _signed_documents_root()
        out_dir = root / str(req.account_id)
        out_dir.mkdir(parents=True, exist_ok=True)
        rel_key = f"{req.account_id}/{req.id}_signed.pdf"
        out_path = out_dir / f"{req.id}_signed.pdf"
        out_path.write_bytes(pdf_bytes)

        req.signer_legal_name = legal_name
        req.status = "signed"
        req.signed_at = now
        req.updated_at = now
        meta = dict(req.provider_metadata or {})
        meta["signed_pdf_saved"] = True
        meta["signed_pdf_rel"] = rel_key
        meta["signed_at_iso"] = signed_iso
        req.provider_metadata = meta
        ev = list(req.events or [])
        ev.append(
            {
                "at": signed_iso,
                "type": "signed",
                "legal_name": legal_name,
                "signature_stored_pdf": True,
            }
        )
        req.events = ev
        req.save(self.db)
        return self.success(
            {
                "status": "signed",
                "signed_at": req.signed_at.isoformat(),
                "signed_copy_available": True,
            }
        )

    def download_signed_document(self, token: str) -> tuple[bytes | None, str]:
        """Success: (file_bytes, download_filename). Failure: (None, error_message)."""
        token = (token or "").strip()
        if not token:
            return None, "Invalid link"
        req = EsignRequest.find_by(self.db, candidate_sign_token=token)
        if not req:
            return None, "Document not found"
        if req.status != "signed":
            return None, "This document has not been signed yet"
        meta = req.provider_metadata if isinstance(req.provider_metadata, dict) else {}
        rel = meta.get("signed_pdf_rel") or meta.get("signed_html_rel")
        if not rel:
            return None, "Signed file is not available for this document"
        rel_clean = str(rel).replace("\\", "/")
        if ".." in rel_clean or rel_clean.startswith(("/", "\\")):
            return None, "Invalid path"
        root = _signed_documents_root()
        path = (root / rel_clean).resolve()
        root_resolved = root.resolve()
        try:
            path.relative_to(root_resolved)
        except ValueError:
            return None, "Invalid path"
        if not path.is_file():
            return None, "Signed file was removed or is unavailable"
        try:
            data = path.read_bytes()
        except OSError:
            return None, "Could not read signed document"
        safe_slug = re.sub(r"[^\w\-]+", "-", (req.signer_legal_name or "signed")[:40]).strip("-") or "signed"
        ext = path.suffix.lower() or ".pdf"
        if ext not in (".pdf", ".html"):
            ext = ".pdf"
        fname = f"signed-document-{safe_slug}{ext}"
        return data, fname
