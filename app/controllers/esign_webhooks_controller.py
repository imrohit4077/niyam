"""POST /api/v1/webhooks/esign — raw body HMAC (no JWT)."""

import json

from app.controllers.base_controller import BaseController
from app.services.esign_webhook_service import EsignWebhookService


class EsignWebhooksController(BaseController):
    async def receive(self):
        raw = await self.request.body()
        sig = self.request.headers.get("X-Niyam-Esign-Signature") or ""
        try:
            payload = json.loads(raw.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            return self.render_error("Invalid JSON", 400)
        if not isinstance(payload, dict):
            return self.render_error("Invalid payload", 400)
        r = EsignWebhookService(self.db).process(raw, sig, payload)
        if not r["ok"]:
            return self.render_error(r["error"], 401)
        return self.render_json(r["data"])
