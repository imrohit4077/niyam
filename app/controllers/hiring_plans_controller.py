"""
HiringPlansController — hiring targets per job (tenant-scoped).
Routes:
  GET    /api/v1/hiring_plans           (?job_id=)
  POST   /api/v1/hiring_plans
  GET    /api/v1/hiring_plans/:id
  PUT    /api/v1/hiring_plans/:id
  DELETE /api/v1/hiring_plans/:id
  GET    /api/v1/jobs/:job_id/hiring_plan   (convenience)
"""

from app.controllers.base_controller import BaseController, before_action
from app.controllers.concerns.authenticatable import Authenticatable
from app.helpers.logger import get_logger
from app.models.account_user import AccountUser
from app.services.hiring_plan_service import HiringPlanService

logger = get_logger(__name__)


class HiringPlansController(BaseController, Authenticatable):

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
        job_raw = self.request.query_params.get("job_id")
        job_id = int(job_raw) if job_raw else None
        result = HiringPlanService(self.db).list_plans(account_id, job_id=job_id)
        return self.render_json(result["data"])

    def show(self):
        account_id = self._account_id()
        plan_id = int(self.request.path_params["id"])
        result = HiringPlanService(self.db).get_plan(account_id, plan_id)
        if not result["ok"]:
            return self.render_error(result["error"], status=404)
        return self.render_json(result["data"])

    def show_for_job(self):
        account_id = self._account_id()
        job_id = int(self.request.path_params["job_id"])
        result = HiringPlanService(self.db).get_plan_for_job(account_id, job_id)
        if not result["ok"]:
            return self.render_error(result["error"], status=404)
        return self.render_json(result["data"])

    async def create(self):
        account_id = self._account_id()
        data = await self._get_body_json()
        result = HiringPlanService(self.db).create_plan(account_id, data)
        if not result["ok"]:
            return self.render_error(result["error"], status=422)
        logger.info(f"HiringPlansController#create — plan id={result['data'].get('id')}")
        return self.render_json(result["data"], status=201)

    async def update(self):
        account_id = self._account_id()
        plan_id = int(self.request.path_params["id"])
        data = await self._get_body_json()
        result = HiringPlanService(self.db).update_plan(account_id, plan_id, data)
        if not result["ok"]:
            return self.render_error(result["error"], status=404)
        return self.render_json(result["data"])

    def destroy(self):
        account_id = self._account_id()
        plan_id = int(self.request.path_params["id"])
        result = HiringPlanService(self.db).delete_plan(account_id, plan_id)
        if not result["ok"]:
            return self.render_error(result["error"], status=404)
        return self.render_json(result["data"])
