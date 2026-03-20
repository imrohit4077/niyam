"""Provider webhooks → update esign_requests (HMAC-verified per account)."""
from __future__ import annotations

import hashlib
import hmac
import json
from datetime import datetime, timezone
from typing import Any

from app.models.account import Account
from app.models.esign_request import EsignRequest
from app.services.base_service import BaseService
from app.services.esign_settings_service import merged_esign_config
from config.settings import get_settings


def _verify_signature(raw_body: bytes, signature_header: str, secret: str) -> bool:
    if not secret or not signature_header:
        return False
    digest = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    candidates = {digest, f"sha256={digest}", f"v1={digest}"}
    return any(hmac.compare_digest(signature_header.strip(), c) for c in candidates)


class EsignWebhookService(BaseService):
    def process(self, raw_body: bytes, signature_header: str, payload: dict[str, Any]) -> dict:
        global_secret = (get_settings().ESIGN_WEBHOOK_SECRET or "").strip()
        req_id = payload.get("esign_request_id")
        ext_id = payload.get("external_envelope_id")
        event = (payload.get("event") or "").strip().lower()

        req: EsignRequest | None = None
        if req_id is not None:
            try:
                req = self.db.get(EsignRequest, int(req_id))
            except (TypeError, ValueError):
                req = None
        if req is None and ext_id:
            req = EsignRequest.find_by(self.db, external_envelope_id=str(ext_id))

        if not req:
            return self.failure("Unknown e-sign request")

        acc = Account.find_by(self.db, id=req.account_id)
        if not acc:
            return self.failure("Account not found")

        cfg = merged_esign_config(acc.settings if isinstance(acc.settings, dict) else {})
        secret = (cfg.get("webhook_secret") or "").strip() or global_secret
        if not _verify_signature(raw_body, signature_header, secret):
            return self.failure("Invalid signature")

        now = datetime.now(timezone.utc)
        ev = list(req.events or [])
        ev.append({"at": now.isoformat(), "type": "webhook", "event": event, "payload_keys": list(payload.keys())})

        if event in ("document.viewed", "envelope.viewed", "viewed"):
            if req.viewed_at is None:
                req.viewed_at = now
            if req.status == "sent":
                req.status = "viewed"
        elif event in ("document.signed", "envelope.completed", "signed", "completed"):
            req.status = "signed"
            req.signed_at = now
            url = payload.get("signed_url") or payload.get("signed_document_url")
            if url:
                req.signed_document_url = str(url)[:1024]
        elif event in ("document.declined", "envelope.declined", "declined"):
            req.status = "declined"
            req.declined_at = now
        else:
            req.provider_metadata = {
                **(dict(req.provider_metadata) if req.provider_metadata else {}),
                "last_webhook": json.loads(json.dumps(payload, default=str)),
            }

        req.events = ev
        req.updated_at = now
        req.save(self.db)
        return self.success({"ok": True, "esign_request_id": req.id, "status": req.status})
