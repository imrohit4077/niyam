"""
Public candidate apply flow (no authentication).
GET  /api/v1/public/apply/:token  — job details safe for candidates
POST /api/v1/public/apply/:token  — submit application
POST /api/v1/public/apply/:token/resume  — multipart resume upload (stored on disk or MinIO)
"""

from app.controllers.base_controller import BaseController
from app.helpers.logger import get_logger
from app.services.public_apply_service import PublicApplyService

logger = get_logger(__name__)


class PublicApplyController(BaseController):
    def show(self):
        token = self.request.path_params.get("token") or ""
        result = PublicApplyService(self.db).show_job(token)
        if not result["ok"]:
            err = result.get("error") or "Not found"
            status = 403 if "not accepting" in err.lower() else 404
            return self.render_error(err, status=status)
        return self.render_json(result["data"])

    async def create(self):
        token = self.request.path_params.get("token") or ""
        data = await self._get_body_json()
        result = PublicApplyService(self.db).submit(token, data)
        if not result["ok"]:
            err = result.get("error") or "Request failed"
            el = err.lower()
            if err == "Job not found":
                status = 404
            elif "not accepting" in el:
                status = 403
            else:
                status = 422
            return self.render_error(err, status=status)
        logger.info("PublicApplyController#create — public application submitted")
        return self.render_json({"submitted": True}, status=201)

    async def upload_resume(self):
        token = self.request.path_params.get("token") or ""
        form = await self.request.form()
        upload = form.get("file")
        if not upload or not hasattr(upload, "read"):
            return self.render_error("file is required", status=422)
        file_bytes = await upload.read()
        result = PublicApplyService(self.db).upload_resume(
            token,
            file_bytes,
            getattr(upload, "filename", "") or "resume.pdf",
        )
        if not result["ok"]:
            err = result.get("error") or "Upload failed"
            el = err.lower()
            if err == "Job not found":
                status = 404
            elif "not accepting" in el:
                status = 403
            else:
                status = 422
            return self.render_error(err, status=status)
        return self.render_json(result["data"], status=201)
