"""Public signing — no JWT."""

from starlette.responses import Response

from app.controllers.base_controller import BaseController
from app.services.esign_public_service import EsignPublicService


class PublicEsignController(BaseController):
    def show_sign(self):
        token = (self.request.path_params.get("token") or "").strip()
        r = EsignPublicService(self.db).get_sign_page(token)
        if not r["ok"]:
            return self.render_error(r["error"], 404)
        return self.render_json(r["data"])

    async def submit_sign(self):
        token = (self.request.path_params.get("token") or "").strip()
        body = await self._get_body_json()
        r = EsignPublicService(self.db).submit_signature(
            token,
            str(body.get("legal_name") or ""),
            bool(body.get("confirm")),
            body.get("signature_image"),
        )
        if not r["ok"]:
            return self.render_error(r["error"], 422)
        return self.render_json(r["data"])

    def download_signed(self):
        token = (self.request.path_params.get("token") or "").strip()
        blob, fname = EsignPublicService(self.db).download_signed_document(token)
        if blob is None:
            return self.render_error(fname, 404)
        media = (
            "application/pdf"
            if fname.lower().endswith(".pdf")
            else "text/html; charset=utf-8"
        )
        return Response(
            content=blob,
            media_type=media,
            headers={
                "Content-Disposition": f'attachment; filename="{fname}"',
                "Cache-Control": "private, no-store",
            },
        )
