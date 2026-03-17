"""
JobPostingsController — distribute jobs to boards.
Routes:
  GET    /api/v1/postings          (all postings for account, ?job_id=X to filter)
  POST   /api/v1/postings
  GET    /api/v1/postings/:id
  PUT    /api/v1/postings/:id
  DELETE /api/v1/postings/:id
"""

from app.controllers.base_controller import BaseController, before_action
from app.controllers.concerns.authenticatable import Authenticatable
from app.helpers.logger import get_logger
from app.models.account_user import AccountUser
from app.services.job_posting_service import JobPostingService

logger = get_logger(__name__)


class JobPostingsController(BaseController, Authenticatable):

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
        job_id_raw = self.request.query_params.get("job_id")
        job_id = int(job_id_raw) if job_id_raw else None
        result = JobPostingService(self.db).list_postings(account_id, job_id=job_id)
        return self.render_json(result["data"])

    def show(self):
        account_id = self._account_id()
        posting_id = int(self.request.path_params["id"])
        result = JobPostingService(self.db).get_posting(account_id, posting_id)
        if not result["ok"]:
            return self.render_error(result["error"], status=404)
        return self.render_json(result["data"])

    async def create(self):
        account_id = self._account_id()
        user_id = self._user_id()
        data = await self._get_body_json()
        result = JobPostingService(self.db).create_posting(account_id, user_id, data)
        if not result["ok"]:
            return self.render_error(result["error"], status=422)
        logger.info(f"JobPostingsController#create — posting created by user={user_id}")
        return self.render_json(result["data"], status=201)

    async def update(self):
        account_id = self._account_id()
        posting_id = int(self.request.path_params["id"])
        data = await self._get_body_json()
        result = JobPostingService(self.db).update_posting(account_id, posting_id, data)
        if not result["ok"]:
            return self.render_error(result["error"], status=404)
        return self.render_json(result["data"])

    def destroy(self):
        account_id = self._account_id()
        posting_id = int(self.request.path_params["id"])
        result = JobPostingService(self.db).delete_posting(account_id, posting_id)
        if not result["ok"]:
            return self.render_error(result["error"], status=404)
        return self.render_json(result["data"])
