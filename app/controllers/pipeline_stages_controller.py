"""
PipelineStagesController — per-job pipeline (Kanban columns).
Routes:
  GET    /api/v1/jobs/:job_id/pipeline_stages
  POST   /api/v1/jobs/:job_id/pipeline_stages
  PATCH  /api/v1/jobs/:job_id/pipeline_stages/reorder
  GET    /api/v1/pipeline_stages/:id
  PUT    /api/v1/pipeline_stages/:id
  DELETE /api/v1/pipeline_stages/:id
"""

from app.controllers.base_controller import BaseController, before_action
from app.controllers.concerns.authenticatable import Authenticatable
from app.helpers.logger import get_logger
from app.models.account_user import AccountUser
from app.services.pipeline_stage_service import PipelineStageService

logger = get_logger(__name__)


class PipelineStagesController(BaseController, Authenticatable):

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

    def index_by_job(self):
        account_id = self._account_id()
        job_id = int(self.request.path_params["job_id"])
        result = PipelineStageService(self.db).list_for_job(account_id, job_id)
        if not result["ok"]:
            return self.render_error(result["error"], status=404)
        return self.render_json(result["data"])

    async def create_by_job(self):
        account_id = self._account_id()
        job_id = int(self.request.path_params["job_id"])
        data = await self._get_body_json()
        result = PipelineStageService(self.db).create_stage(account_id, job_id, data)
        if not result["ok"]:
            return self.render_error(result["error"], status=422)
        logger.info(f"PipelineStagesController#create — job={job_id} stage={result['data'].get('id')}")
        return self.render_json(result["data"], status=201)

    async def reorder_by_job(self):
        account_id = self._account_id()
        job_id = int(self.request.path_params["job_id"])
        data = await self._get_body_json()
        ordered = data.get("ordered_ids") or data.get("stage_ids")
        result = PipelineStageService(self.db).reorder_stages(account_id, job_id, ordered)
        if not result["ok"]:
            return self.render_error(result["error"], status=422)
        return self.render_json(result["data"])

    def show(self):
        account_id = self._account_id()
        stage_id = int(self.request.path_params["id"])
        result = PipelineStageService(self.db).get_stage(account_id, stage_id)
        if not result["ok"]:
            return self.render_error(result["error"], status=404)
        return self.render_json(result["data"])

    async def update(self):
        account_id = self._account_id()
        stage_id = int(self.request.path_params["id"])
        data = await self._get_body_json()
        result = PipelineStageService(self.db).update_stage(account_id, stage_id, data)
        if not result["ok"]:
            return self.render_error(result["error"], status=404)
        return self.render_json(result["data"])

    def destroy(self):
        account_id = self._account_id()
        stage_id = int(self.request.path_params["id"])
        result = PipelineStageService(self.db).delete_stage(account_id, stage_id)
        if not result["ok"]:
            return self.render_error(result["error"], status=404)
        return self.render_json(result["data"])
