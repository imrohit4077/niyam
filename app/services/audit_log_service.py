"""
Audit log: enqueue writes to Celery (no request latency). Admin-only read paths use sync SELECT.
"""

from typing import Any, Optional

from sqlalchemy import String, cast, func, or_, select

from app.jobs.audit_log_append_job import audit_log_append
from app.models.account import Account
from app.models.audit_log_delivery_failure import AuditLogDeliveryFailure
from app.models.audit_log_entry import AuditLogEntry
from app.models.user import User
from app.services.audit_enrichment_service import merge_account_audit_prefs
from app.services.base_service import BaseService


class AuditLogService(BaseService):
    """Enqueue append-only audit events and list entries for privileged admins."""

    @classmethod
    def enqueue(
        cls,
        *,
        account_id: int,
        actor_user_id: Optional[int] = None,
        http_method: Optional[str] = None,
        path: Optional[str] = None,
        status_code: Optional[int] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[int] = None,
        action: Optional[str] = None,
        resource: Optional[str] = None,
        severity: Optional[str] = None,
        old_value: Optional[dict[str, Any]] = None,
        new_value: Optional[dict[str, Any]] = None,
        metadata: Optional[dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_id: Optional[str] = None,
        event_source: Optional[str] = None,
        log_category: Optional[str] = None,
    ) -> None:
        """
        Fire-and-forget insert via Celery. Drops keys with None so create() only sets real columns.

        For compliance-grade before/after on mutations, pass ``old_value`` / ``new_value`` (small JSON
        snapshots) from the controller when safe — HTTP middleware does not capture bodies by default.
        """
        payload: dict[str, Any] = {"account_id": account_id}
        optional: dict[str, Any] = {
            "actor_user_id": actor_user_id,
            "http_method": http_method,
            "path": path,
            "status_code": status_code,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "action": action,
            "resource": resource,
            "severity": severity,
            "old_value": old_value,
            "new_value": new_value,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "request_id": request_id,
            "event_source": event_source,
            "log_category": log_category,
        }
        for key, val in optional.items():
            if val is not None:
                payload[key] = val
        if metadata is not None:
            payload["metadata_"] = metadata

        audit_log_append.apply_async(kwargs=payload, queue="default")

    def compliance_document(self, account_id: int) -> dict[str, Any]:
        """Structured copy for the settings UI + total row count."""
        total = self.db.scalar(
            select(func.count()).select_from(AuditLogEntry).where(AuditLogEntry.account_id == account_id)
        )
        acc = Account.find_by(self.db, id=account_id)
        prefs = (
            merge_account_audit_prefs(acc)
            if acc
            else {
                "track_mutations": True,
                "track_sensitive_reads": True,
                "track_all_reads": False,
                "track_read_requests": False,
            }
        )
        return {
            "title": "Write-only audit log",
            "summary": (
                "Audit trails and permissions are interlocking: permissions define what people may do; "
                "the audit log records what they actually did. Entries are append-only at the database layer."
            ),
            "write_only": {
                "heading": "The audit log must be write-only",
                "body": (
                    "This is the most commonly skipped detail. If audit logs live in the same database table that "
                    "admins can access and modify, a bad actor can delete evidence of their own actions. The audit log "
                    "should write to a separate append-only store — even just a separate Postgres table with "
                    "REVOKE UPDATE, DELETE on the audit table FROM the application role — or an external service like "
                    "a time-series log store. Admins should be able to read and filter logs, never edit them."
                ),
                "bullets": [
                    "ForgeAPI uses a dedicated audit_log_entries table with a database trigger that rejects UPDATE and DELETE (append-only at the DB layer).",
                    "Application inserts are enqueued to a background worker so requests do not wait on log persistence.",
                    "Product surfaces are read-only: privileged admins see entries; there is no API to rewrite history.",
                    "For defense in depth in production: grant the app DB role only SELECT + INSERT on this table; run migrations under a separate role.",
                    "You may later replicate rows to an external SIEM or cold store without changing the append-only contract.",
                ],
            },
            "operations": {
                "heading": "How ForgeAPI applies this",
                "bullets": [
                    "Writes are enqueued to a background worker (not inline in the request) so APIs stay fast.",
                    "Events are labeled by product area and action type; sensitive GETs are catalog-driven, not all GETs.",
                    "Each row can carry request_id (correlation), IP, user-agent, log stream (audit vs activity), and optional before/after JSON from app code.",
                    "The append-only table can be replicated to a SIEM, warehouse, or log platform for compliance programs.",
                ],
            },
            "audit_trail": {
                "track_mutations": prefs["track_mutations"],
                "track_sensitive_reads": prefs["track_sensitive_reads"],
                "track_all_reads": prefs["track_all_reads"],
                "track_read_requests": prefs["track_read_requests"],
                "action_types": [
                    {
                        "code": "read",
                        "label": "Info",
                        "http_verbs": ["GET"],
                        "description": (
                            "Use \"Sensitive data access\" for PII/confidential views (recommended). "
                            "\"Log all reads\" captures every GET and is noisy on busy accounts."
                        ),
                    },
                    {
                        "code": "create",
                        "label": "Create",
                        "http_verbs": ["POST"],
                        "description": "New records and workflow starts.",
                    },
                    {
                        "code": "update",
                        "label": "Update",
                        "http_verbs": ["PUT", "PATCH"],
                        "description": "Edits, moves, and configuration changes.",
                    },
                    {
                        "code": "delete",
                        "label": "Delete",
                        "http_verbs": ["DELETE"],
                        "description": "Removals and destructive actions.",
                    },
                ],
                "log_streams": [
                    {
                        "code": "audit",
                        "label": "Audit",
                        "description": "Compliance stream: writes, permission changes, and sensitive reads (PII access).",
                    },
                    {
                        "code": "activity",
                        "label": "Activity",
                        "description": "Routine browsing (GET) when \"Log all reads\" is on — not a full compliance access log.",
                    },
                    {
                        "code": "system",
                        "label": "System",
                        "description": "Reserved for workers, webhooks, and exports (future use).",
                    },
                ],
            },
            "stats": {"total_entries": int(total or 0)},
        }

    def list_for_account(
        self,
        account_id: int,
        *,
        page: int = 1,
        per_page: int = 20,
        path_contains: Optional[str] = None,
        log_category: Optional[str] = None,
    ) -> dict[str, Any]:
        per_page = min(max(per_page, 1), 100)
        page = max(page, 1)
        offset = (page - 1) * per_page

        filters: list[Any] = [AuditLogEntry.account_id == account_id]
        if log_category and log_category.strip() in ("audit", "activity", "system"):
            filters.append(AuditLogEntry.log_category == log_category.strip())
        if path_contains:
            term = path_contains.strip()[:500]
            if term:
                like = f"%{term}%"
                filters.append(
                    or_(
                        AuditLogEntry.path.ilike(like),
                        AuditLogEntry.action.ilike(like),
                        AuditLogEntry.resource.ilike(like),
                        cast(AuditLogEntry.metadata_, String).ilike(like),
                    )
                )

        total = self.db.scalar(select(func.count()).select_from(AuditLogEntry).where(*filters))
        stmt = (
            select(AuditLogEntry)
            .where(*filters)
            .order_by(AuditLogEntry.created_at.desc())
            .offset(offset)
            .limit(per_page)
        )
        rows = list(self.db.execute(stmt).scalars().all())
        actor_ids = {r.actor_user_id for r in rows if r.actor_user_id}
        user_map: dict[int, str] = {}
        if actor_ids:
            users = self.db.execute(select(User).where(User.id.in_(actor_ids))).scalars().all()
            for u in users:
                label = (u.name or u.email or "").strip()
                user_map[u.id] = label if label else f"User #{u.id}"

        out: list[dict[str, Any]] = []
        for r in rows:
            d = r.to_dict()
            if "metadata_" in d:
                d["metadata"] = d.pop("metadata_")
            aid = d.get("actor_user_id")
            if aid is not None and int(aid) in user_map:
                d["actor_display"] = user_map[int(aid)]
            ca = d.get("created_at")
            if ca is not None and hasattr(ca, "isoformat"):
                d["created_at"] = ca.isoformat()
            out.append(d)

        total_n = int(total or 0)
        total_pages = max((total_n + per_page - 1) // per_page, 1) if total_n else 0
        return self.success(
            {
                "entries": out,
                "meta": {
                    "total": total_n,
                    "page": page,
                    "per_page": per_page,
                    "total_pages": total_pages,
                    "last_page": total_pages,
                    "has_next": page < total_pages,
                    "has_prev": page > 1,
                },
            }
        )

    def list_delivery_failures(
        self,
        account_id: int,
        *,
        page: int = 1,
        per_page: int = 20,
    ) -> dict[str, Any]:
        """Rows where the audit worker failed after all retries (admin observability)."""
        per_page = min(max(per_page, 1), 100)
        page = max(page, 1)
        offset = (page - 1) * per_page

        filters = [AuditLogDeliveryFailure.account_id == account_id]
        total = self.db.scalar(select(func.count()).select_from(AuditLogDeliveryFailure).where(*filters))
        stmt = (
            select(AuditLogDeliveryFailure)
            .where(*filters)
            .order_by(AuditLogDeliveryFailure.created_at.desc())
            .offset(offset)
            .limit(per_page)
        )
        rows = list(self.db.execute(stmt).scalars().all())
        out: list[dict[str, Any]] = []
        for r in rows:
            d = r.to_dict()
            ca = d.get("created_at")
            if ca is not None and hasattr(ca, "isoformat"):
                d["created_at"] = ca.isoformat()
            out.append(d)

        total_n = int(total or 0)
        total_pages = max((total_n + per_page - 1) // per_page, 1) if total_n else 0
        return self.success(
            {
                "entries": out,
                "meta": {
                    "total": total_n,
                    "page": page,
                    "per_page": per_page,
                    "total_pages": total_pages,
                    "last_page": total_pages,
                    "has_next": page < total_pages,
                    "has_prev": page > 1,
                },
            }
        )
