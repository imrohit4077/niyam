"""
Interview plans + kits (nested under jobs).
Routes:
  GET    /api/v1/jobs/:job_id/interview_plans
  POST   /api/v1/jobs/:job_id/interview_plans
  GET    /api/v1/jobs/:job_id/interview_plans/:plan_id
  PUT    /api/v1/jobs/:job_id/interview_plans/:plan_id
  DELETE /api/v1/jobs/:job_id/interview_plans/:plan_id
  GET    /api/v1/jobs/:job_id/interview_plans/:plan_id/kit
  PUT    /api/v1/jobs/:job_id/interview_plans/:plan_id/kit
"""

from app.controllers.base_controller import BaseController, before_action
from app.controllers.concerns.authenticatable import Authenticatable
from app.helpers.logger import get_logger
from app.models.account_user import AccountUser
from app.services.interview_plan_service import InterviewPlanService

logger = get_logger(__name__)


class InterviewPlansController(BaseController, Authenticatable):

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

    def _job_plan_mismatch(self, job_id: int, plan_payload: dict) -> bool:
        return int(plan_payload.get("job_id", 0)) != job_id

    def index_by_job(self):
        account_id = self._account_id()
        job_id = int(self.request.path_params["job_id"])
        self.require_permission("jobs", "view", account_id=account_id, job_id=job_id)
        result = InterviewPlanService(self.db).list_for_job(account_id, job_id)
        if not result["ok"]:
            return self.render_error(result["error"], status=404)
        return self.render_json(result["data"])

    async def create_by_job(self):
        account_id = self._account_id()
        job_id = int(self.request.path_params["job_id"])
        self.require_permission("jobs", "edit", account_id=account_id, job_id=job_id)
        data = await self._get_body_json()
        result = InterviewPlanService(self.db).create(account_id, job_id, data)
        if not result["ok"]:
            return self.render_error(result["error"], status=422)
        logger.info(
            "InterviewPlansController#create",
            extra={"job_id": job_id, "plan_id": result["data"].get("id")},
        )
        return self.render_json(result["data"], status=201)

    def show_for_job(self):
        account_id = self._account_id()
        job_id = int(self.request.path_params["job_id"])
        self.require_permission("jobs", "view", account_id=account_id, job_id=job_id)
        plan_id = int(self.request.path_params["plan_id"])
        result = InterviewPlanService(self.db).get(account_id, plan_id)
        if not result["ok"]:
            return self.render_error(result["error"], status=404)
        if self._job_plan_mismatch(job_id, result["data"]):
            return self.render_error("Interview plan not found", status=404)
        return self.render_json(result["data"])

    async def update_for_job(self):
        account_id = self._account_id()
        job_id = int(self.request.path_params["job_id"])
        self.require_permission("jobs", "edit", account_id=account_id, job_id=job_id)
        plan_id = int(self.request.path_params["plan_id"])
        data = await self._get_body_json()
        result = InterviewPlanService(self.db).get(account_id, plan_id)
        if not result["ok"]:
            return self.render_error(result["error"], status=404)
        if self._job_plan_mismatch(job_id, result["data"]):
            return self.render_error("Interview plan not found", status=404)
        result = InterviewPlanService(self.db).update(account_id, plan_id, data)
        if not result["ok"]:
            return self.render_error(result["error"], status=404)
        return self.render_json(result["data"])

    def destroy_for_job(self):
        account_id = self._account_id()
        job_id = int(self.request.path_params["job_id"])
        self.require_permission("jobs", "edit", account_id=account_id, job_id=job_id)
        plan_id = int(self.request.path_params["plan_id"])
        result = InterviewPlanService(self.db).get(account_id, plan_id)
        if not result["ok"]:
            return self.render_error(result["error"], status=404)
        if self._job_plan_mismatch(job_id, result["data"]):
            return self.render_error("Interview plan not found", status=404)
        result = InterviewPlanService(self.db).delete(account_id, plan_id)
        if not result["ok"]:
            return self.render_error(result["error"], status=404)
        return self.render_json(result["data"])

    def get_kit_for_job(self):
        account_id = self._account_id()
        job_id = int(self.request.path_params["job_id"])
        self.require_permission("jobs", "view", account_id=account_id, job_id=job_id)
        plan_id = int(self.request.path_params["plan_id"])
        result = InterviewPlanService(self.db).get(account_id, plan_id)
        if not result["ok"]:
            return self.render_error(result["error"], status=404)
        if self._job_plan_mismatch(job_id, result["data"]):
            return self.render_error("Interview plan not found", status=404)
        result = InterviewPlanService(self.db).get_kit(account_id, plan_id)
        if not result["ok"]:
            return self.render_error(result["error"], status=404)
        return self.render_json(result["data"])

    async def upsert_kit_for_job(self):
        account_id = self._account_id()
        job_id = int(self.request.path_params["job_id"])
        self.require_permission("jobs", "edit", account_id=account_id, job_id=job_id)
        plan_id = int(self.request.path_params["plan_id"])
        result = InterviewPlanService(self.db).get(account_id, plan_id)
        if not result["ok"]:
            return self.render_error(result["error"], status=404)
        if self._job_plan_mismatch(job_id, result["data"]):
            return self.render_error("Interview plan not found", status=404)
        data = await self._get_body_json()
        result = InterviewPlanService(self.db).upsert_kit(account_id, plan_id, data)
        if not result["ok"]:
            return self.render_error(result["error"], status=422)
        return self.render_json(result["data"])
