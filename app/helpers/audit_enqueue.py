"""
Fire-and-forget audit logging via Celery. Call from middleware only; must never block or raise to callers.

Uses audit_route_catalog for human-readable feature names and summaries (not raw API strings).
"""

from app.helpers.audit_mutation import mutation_metadata, severity_for_http_status
from app.helpers.audit_route_catalog import describe_request
from app.helpers.logger import get_logger

logger = get_logger(__name__)

# Do not log reads of audit tooling (noise + recursion when UI polls).
_SELF_AUDIT_GET_PREFIXES: tuple[str, ...] = (
    "/api/v1/account/audit_log",
    "/api/v1/account/audit_log_failures",
    "/api/v1/account/audit_compliance",
)


def should_skip_audit_get(path: str) -> bool:
    return any(path == p or path.startswith(p + "?") for p in _SELF_AUDIT_GET_PREFIXES)


def enqueue_api_audit(
    *,
    actor_user_id: int,
    http_method: str,
    path: str,
    status_code: int,
    ip_address: str | None,
    user_agent: str | None,
    request_id: str | None = None,
) -> None:
    try:
        from app.jobs.audit_log_append_job import audit_log_append

        method_u = http_method.upper()
        if method_u == "GET" and should_skip_audit_get(path):
            return

        desc = describe_request(http_method, path)
        meta = mutation_metadata(http_method=http_method, path=path, status_code=status_code)
        for k, v in desc.items():
            meta[k] = v
        meta["from_catalog"] = True
        meta["event_source"] = "api"
        if request_id:
            meta["request_id"] = request_id

        payload: dict = {
            "actor_user_id": actor_user_id,
            "http_method": http_method,
            "path": path,
            "status_code": status_code,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "action": desc["action_code"],
            "resource": desc.get("feature_area", "workspace"),
            "severity": severity_for_http_status(status_code),
            "metadata_": meta,
            "event_source": "api",
        }
        if request_id:
            payload["request_id"] = request_id

        audit_log_append.apply_async(kwargs=payload, queue="default")
    except Exception:
        logger.exception("enqueue_api_audit failed (non-fatal)")
