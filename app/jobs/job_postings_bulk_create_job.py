"""Create the same job posting across multiple boards (queued, idempotent per board)."""

from __future__ import annotations

from typing import Any

from config.celery import celery_app
from config.database import SessionLocal
from app.helpers.logger import get_logger
from app.services.job_posting_service import JobPostingService

logger = get_logger(__name__)


@celery_app.task(name="niyam.job_postings_bulk_create", ignore_result=True)
def job_postings_bulk_create(
    account_id: int,
    user_id: int,
    job_id: int,
    board_ids: list[int],
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    db = SessionLocal()
    created: list[int] = []
    skipped: list[dict[str, Any]] = []
    try:
        svc = JobPostingService(db)
        payload_base = dict(extra or {})
        payload_base["job_id"] = job_id
        for board_id in board_ids:
            try:
                bid = int(board_id)
            except (TypeError, ValueError):
                skipped.append({"board_id": board_id, "error": "invalid board id"})
                continue
            res = svc.create_posting(account_id, user_id, {**payload_base, "board_id": bid})
            if res.get("ok"):
                pid = (res.get("data") or {}).get("id")
                if pid:
                    created.append(int(pid))
            else:
                skipped.append({"board_id": bid, "error": res.get("error")})
        logger.info(
            "job_postings_bulk_create done",
            extra={
                "account_id": account_id,
                "job_id": job_id,
                "created_count": len(created),
                "skipped_count": len(skipped),
            },
        )
        return {"created": created, "skipped": skipped}
    finally:
        db.close()
