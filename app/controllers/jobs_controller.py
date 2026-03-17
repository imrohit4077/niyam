"""
JobsController — CRUD for jobs + nested versions.
Routes:
  GET    /api/v1/jobs
  POST   /api/v1/jobs
  GET    /api/v1/jobs/:id
  PUT    /api/v1/jobs/:id
  DELETE /api/v1/jobs/:id
  GET    /api/v1/jobs/:job_id/versions
  POST   /api/v1/jobs/:job_id/versions
"""

from app.controllers.base_controller import BaseController, before_action
from app.controllers.concerns.authenticatable import Authenticatable
from app.helpers.logger import get_logger
from app.models.account_user import AccountUser
from app.services.job_service import JobService
from sqlalchemy import select

logger = get_logger(__name__)


class JobsController(BaseController, Authenticatable):

    @before_action
    def require_auth(self):
        self.authenticate_user()

    def _account_id(self) -> int:
        user_id = self._user_id()
        au = AccountUser.find_by(self.db, user_id=user_id)
        if not au:
            from fastapi import HTTPException
            raise HTTPException(status_code=403, detail="No account membership found")
        return au.account_id

    def index(self):
        account_id = self._account_id()
        status = self.request.query_params.get("status")
        result = JobService(self.db).list_jobs(account_id, status=status)
        return self.render_json(result["data"])

    def show(self):
        account_id = self._account_id()
        job_id = int(self.request.path_params["id"])
        result = JobService(self.db).get_job(account_id, job_id)
        if not result["ok"]:
            return self.render_error(result["error"], status=404)
        return self.render_json(result["data"])

    async def create(self):
        account_id = self._account_id()
        user_id = self._user_id()
        data = await self._get_body_json()
        result = JobService(self.db).create_job(account_id, user_id, data)
        if not result["ok"]:
            return self.render_error(result["error"], status=422)
        logger.info(f"JobsController#create — job created by user={user_id}")
        return self.render_json(result["data"], status=201)

    async def update(self):
        account_id = self._account_id()
        job_id = int(self.request.path_params["id"])
        data = await self._get_body_json()
        result = JobService(self.db).update_job(account_id, job_id, data)
        if not result["ok"]:
            return self.render_error(result["error"], status=404)
        return self.render_json(result["data"])

    def destroy(self):
        account_id = self._account_id()
        job_id = int(self.request.path_params["id"])
        result = JobService(self.db).delete_job(account_id, job_id)
        if not result["ok"]:
            return self.render_error(result["error"], status=404)
        return self.render_json(result["data"])

    # ── Nested versions ──────────────────────────────────────────

    def list_versions(self):
        account_id = self._account_id()
        job_id = int(self.request.path_params["job_id"])
        result = JobService(self.db).list_versions(account_id, job_id)
        if not result["ok"]:
            return self.render_error(result["error"], status=404)
        return self.render_json(result["data"])

    async def create_version(self):
        account_id = self._account_id()
        job_id = int(self.request.path_params["job_id"])
        user_id = self._user_id()
        data = await self._get_body_json()
        result = JobService(self.db).create_version(account_id, job_id, user_id, data)
        if not result["ok"]:
            return self.render_error(result["error"], status=422)
        return self.render_json(result["data"], status=201)
