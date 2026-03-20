"""
ApplicationsController — candidate applications CRUD + stage management.
Routes:
  GET    /api/v1/applications          (?job_id=X, ?status=X)
  POST   /api/v1/applications
  GET    /api/v1/applications/:id
  DELETE /api/v1/applications/:id
  PATCH  /api/v1/applications/:id/stage   (body: status?, pipeline_stage_id?, reason?)
"""

from app.controllers.base_controller import BaseController, before_action
from app.controllers.concerns.authenticatable import Authenticatable
from app.helpers.logger import get_logger
from app.models.account_user import AccountUser
from app.services.application_service import ApplicationService

logger = get_logger(__name__)


class ApplicationsController(BaseController, Authenticatable):

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
        status = self.request.query_params.get("status")
        job_id = int(job_id_raw) if job_id_raw else None
        result = ApplicationService(self.db).list_applications(account_id, job_id=job_id, status=status)
        return self.render_json(result["data"])

    def show(self):
        account_id = self._account_id()
        app_id = int(self.request.path_params["id"])
        result = ApplicationService(self.db).get_application(account_id, app_id)
        if not result["ok"]:
            return self.render_error(result["error"], status=404)
        return self.render_json(result["data"])

    async def create(self):
        account_id = self._account_id()
        data = await self._get_body_json()
        result = ApplicationService(self.db).create_application(account_id, data)
        if not result["ok"]:
            return self.render_error(result["error"], status=422)
        logger.info(f"ApplicationsController#create — application created account={account_id}")
        return self.render_json(result["data"], status=201)

    def destroy(self):
        account_id = self._account_id()
        app_id = int(self.request.path_params["id"])
        result = ApplicationService(self.db).delete_application(account_id, app_id)
        if not result["ok"]:
            return self.render_error(result["error"], status=404)
        return self.render_json(result["data"])

    async def update_stage(self):
        account_id = self._account_id()
        user_id = self._user_id()
        app_id = int(self.request.path_params["id"])
        data = await self._get_body_json()
        result = ApplicationService(self.db).update_stage(
            account_id,
            app_id,
            user_id,
            status=data.get("status"),
            reason=data.get("reason"),
            pipeline_stage_id=data.get("pipeline_stage_id"),
            pipeline_touch="pipeline_stage_id" in data,
            status_touch="status" in data,
        )
        if not result["ok"]:
            return self.render_error(result["error"], status=422)
        logger.info(f"ApplicationsController#update_stage — id={app_id} status={status}")
        return self.render_json(result["data"])
