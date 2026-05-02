"""
ApplicationsController — candidate applications CRUD + stage management.
Routes:
  GET    /api/v1/applications (?job_id=&status=&q=&source_type=)
  POST   /api/v1/applications
  GET    /api/v1/applications/:id
  PATCH  /api/v1/applications/:id       (body: candidate fields, tags, notes — see service)
  DELETE /api/v1/applications/:id
  PATCH  /api/v1/applications/:id/stage   (body: status?, pipeline_stage_id?, reason?)
"""

from app.controllers.base_controller import BaseController, before_action
from app.controllers.concerns.authenticatable import Authenticatable
from app.helpers.logger import get_logger
from app.models.account_user import AccountUser
from app.models.application import Application
from app.services.access_control import (
    application_list_access_mode,
    can_mutate_application_fields,
    effective_keys,
)
from app.services.application_service import ApplicationService
from app.services.label_service import LABELABLE_APPLICATION, LabelService
from app.services.permission_resolution_service import permission_key

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
        uid = self._user_id()
        job_id_raw = self.request.query_params.get("job_id")
        status = self.request.query_params.get("status")
        q = self.request.query_params.get("q")
        source_type = self.request.query_params.get("source_type")
        job_id = int(job_id_raw) if job_id_raw else None
        mode = application_list_access_mode(self.db, account_id, int(uid), job_id)
        if mode is None:
            return self.render_error("Not allowed", status=403)
        result = ApplicationService(self.db).list_applications(
            account_id,
            job_id=job_id,
            status=status,
            q=q,
            source_type=source_type,
            viewer_user_id=int(uid),
            access_mode=mode,
        )
        return self.render_json(result["data"])

    def show(self):
        account_id = self._account_id()
        app_id = int(self.request.path_params["id"])
        result = ApplicationService(self.db).get_application(account_id, app_id, viewer_user_id=int(self._user_id()))
        if not result["ok"]:
            return self.render_error(result["error"], status=404)
        return self.render_json(result["data"])

    async def update(self):
        account_id = self._account_id()
        app_id = int(self.request.path_params["id"])
        data = await self._get_body_json()
        result = ApplicationService(self.db).update_application(
            account_id, app_id, data, viewer_user_id=int(self._user_id())
        )
        if not result["ok"]:
            return self.render_error(result["error"], status=422)
        return self.render_json(result["data"])

    async def update_labels(self):
        account_id = self._account_id()
        app_id = int(self.request.path_params["id"])
        app = Application.find_by(self.db, id=app_id, account_id=account_id)
        if not app or app.deleted_at or not can_mutate_application_fields(
            self.db, account_id, int(self._user_id()), app
        ):
            return self.render_error("Application not found", status=404)
        body = await self._get_body_json()
        raw = body.get("label_ids")
        if not isinstance(raw, list):
            return self.render_error("label_ids must be an array of numeric ids", status=422)
        try:
            label_ids = [int(x) for x in raw]
        except (TypeError, ValueError):
            return self.render_error("label_ids must be an array of numeric ids", status=422)
        r = LabelService(self.db).set_entity_labels(
            account_id, LABELABLE_APPLICATION, app_id, label_ids
        )
        if not r["ok"]:
            return self.render_error(r["error"], status=422)
        return self.render_json(r["data"])

    async def create(self):
        account_id = self._account_id()
        uid = int(self._user_id())
        keys = effective_keys(self.db, account_id, uid, None)
        if permission_key("applications", "view_all") not in keys and permission_key(
            "sourcing", "add_candidate"
        ) not in keys:
            return self.render_error("Not allowed", status=403)
        data = await self._get_body_json()
        result = ApplicationService(self.db).create_application(account_id, data)
        if not result["ok"]:
            return self.render_error(result["error"], status=422)
        logger.info(f"ApplicationsController#create — application created account={account_id}")
        return self.render_json(result["data"], status=201)

    def destroy(self):
        account_id = self._account_id()
        app_id = int(self.request.path_params["id"])
        result = ApplicationService(self.db).delete_application(
            account_id, app_id, viewer_user_id=int(self._user_id())
        )
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
        row = result["data"]
        logger.info(
            f"ApplicationsController#update_stage — id={app_id} "
            f"status={row.get('status')} pipeline_stage_id={row.get('pipeline_stage_id')}"
        )
        return self.render_json(result["data"])
