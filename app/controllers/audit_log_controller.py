"""Admin read-only access to append-only audit log + compliance documentation for settings."""

from app.controllers.base_controller import BaseController, before_action
from app.controllers.concerns.authenticatable import Authenticatable
from app.models.account_user import AccountUser
from app.services.audit_log_service import AuditLogService
from app.services.audit_trail_settings_service import AuditTrailSettingsService


class AuditLogController(BaseController, Authenticatable):

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

    def _client_ip(self) -> str | None:
        client = getattr(self.request, "client", None)
        return client.host if client else None

    def compliance(self):
        """Policy copy for settings; enqueues a low-severity view event asynchronously."""
        self.require_admin()
        account_id = self._account_id()
        path = str(self.request.url.path)
        rid = getattr(self.request.state, "request_id", None)
        AuditLogService.enqueue(
            account_id=account_id,
            actor_user_id=self._user_id(),
            action="settings.audit_compliance_viewed",
            resource="Settings",
            severity="low",
            http_method="GET",
            path=path,
            status_code=200,
            request_id=rid if isinstance(rid, str) else None,
            event_source="ui",
            log_category="audit",
            metadata={
                "source": "settings_ui",
                "settings_ui": True,
                "feature_area": "Settings",
                "feature_label": "Audit & compliance",
                "summary": "Opened Audit & compliance (overview)",
                "action_type": "read",
                "action_kind_label": "Info",
                "event_source": "ui",
            },
            ip_address=self._client_ip(),
        )
        doc = AuditLogService(self.db).compliance_document(account_id)
        return self.render_json(doc)

    async def update_audit_trail(self):
        """PATCH account-level audit preferences (admin)."""
        self.require_admin()
        account_id = self._account_id()
        data = await self._get_body_json()
        r = AuditTrailSettingsService(self.db).update(account_id, data if isinstance(data, dict) else {})
        if not r["ok"]:
            return self.render_error(r.get("error") or "Failed", status=422)
        return self.render_json(r["data"])

    def index(self):
        self.require_admin()
        account_id = self._account_id()
        q = self.request.query_params
        try:
            page = int(q.get("page") or 1)
        except (TypeError, ValueError):
            page = 1
        try:
            per_page = int(q.get("per_page") or 20)
        except (TypeError, ValueError):
            per_page = 20
        path_contains = q.get("path_contains") or q.get("q")
        log_category = q.get("log_category")
        r = AuditLogService(self.db).list_for_account(
            account_id,
            page=page,
            per_page=per_page,
            path_contains=path_contains,
            log_category=log_category if isinstance(log_category, str) else None,
        )
        if not r["ok"]:
            return self.render_error(r.get("error") or "Failed", status=500)
        payload = r["data"]
        return self.render_json(payload["entries"], meta=payload["meta"])

    def failures(self):
        """GET: rows where async audit delivery failed after retries (same admin gate as audit log)."""
        self.require_admin()
        account_id = self._account_id()
        q = self.request.query_params
        try:
            page = int(q.get("page") or 1)
        except (TypeError, ValueError):
            page = 1
        try:
            per_page = int(q.get("per_page") or 20)
        except (TypeError, ValueError):
            per_page = 20
        r = AuditLogService(self.db).list_delivery_failures(account_id, page=page, per_page=per_page)
        if not r["ok"]:
            return self.render_error(r.get("error") or "Failed", status=500)
        payload = r["data"]
        return self.render_json(payload["entries"], meta=payload["meta"])
