"""Candidate portal public auth + self-serve profile/application endpoints."""
from app.controllers.base_controller import BaseController, before_action
from app.helpers.logger import get_logger
from app.services.candidate_portal_service import CandidatePortalService
from fastapi import HTTPException

logger = get_logger(__name__)


class CandidatePortalController(BaseController):
    @before_action(only=["me", "update_me", "my_applications", "upload_photo", "upload_resume"])
    def require_candidate_auth(self):
        user = getattr(self.request.state, "current_user", None)
        if not user or user.get("role") != "candidate_portal" or user.get("type") != "access":
            raise HTTPException(status_code=401, detail="Authentication required")
        self.current_candidate = user

    def _candidate_id(self) -> int:
        sub = self.current_candidate.get("sub")
        return int(sub)

    async def register(self):
        data = await self._get_body_json()
        result = CandidatePortalService(self.db).register(
            email=str(data.get("email") or ""),
            password=str(data.get("password") or ""),
            full_name=str(data.get("full_name") or "") or None,
        )
        if not result["ok"]:
            err = result["error"]
            status = 422
            if err.startswith("An account for this email already exists"):
                status = 409
            elif err.startswith("The candidate portal is not available"):
                status = 503
            logger.info("candidate_portal.register rejected (%s): %s", status, err)
            return self.render_error(err, status=status)
        return self.render_json(result["data"], status=201)

    async def login(self):
        data = await self._get_body_json()
        result = CandidatePortalService(self.db).login(
            email=str(data.get("email") or ""),
            password=str(data.get("password") or ""),
        )
        if not result["ok"]:
            return self.render_error(result["error"], status=401)
        return self.render_json(result["data"])

    def me(self):
        result = CandidatePortalService(self.db).me(self._candidate_id())
        if not result["ok"]:
            return self.render_error(result["error"], status=404)
        return self.render_json(result["data"])

    async def update_me(self):
        data = await self._get_body_json()
        result = CandidatePortalService(self.db).update_me(self._candidate_id(), data)
        if not result["ok"]:
            return self.render_error(result["error"], status=422)
        return self.render_json(result["data"])

    def my_applications(self):
        result = CandidatePortalService(self.db).my_applications(self._candidate_id())
        if not result["ok"]:
            return self.render_error(result["error"], status=404)
        return self.render_json(result["data"])

    async def upload_photo(self):
        form = await self.request.form()
        upload = form.get("file")
        if not upload or not hasattr(upload, "read"):
            return self.render_error("file is required", status=422)
        file_bytes = await upload.read()
        result = CandidatePortalService(self.db).upload_asset(
            self._candidate_id(),
            kind="avatar",
            file_bytes=file_bytes,
            original_filename=getattr(upload, "filename", "") or "avatar",
        )
        if not result["ok"]:
            return self.render_error(result["error"], status=422)
        return self.render_json(result["data"], status=201)

    async def upload_resume(self):
        form = await self.request.form()
        upload = form.get("file")
        if not upload or not hasattr(upload, "read"):
            return self.render_error("file is required", status=422)
        file_bytes = await upload.read()
        result = CandidatePortalService(self.db).upload_asset(
            self._candidate_id(),
            kind="resume",
            file_bytes=file_bytes,
            original_filename=getattr(upload, "filename", "") or "resume",
        )
        if not result["ok"]:
            return self.render_error(result["error"], status=422)
        return self.render_json(result["data"], status=201)
