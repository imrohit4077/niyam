"""JobPostingService — distribute jobs to boards."""
from datetime import datetime, timezone

from sqlalchemy import or_, select

from app.helpers.pg_search import ilike_contains, normalize_q, trigram_or
from app.models.job import Job
from app.models.job_board import JobBoard
from app.models.job_posting import JobPosting
from app.helpers.logger import get_logger
from app.services.base_service import BaseService

logger = get_logger(__name__)


class JobPostingService(BaseService):
    def list_postings(
        self,
        account_id: int,
        job_id: int | None = None,
        q: str | None = None,
        status: str | None = None,
    ) -> dict:
        stmt = (
            select(JobPosting)
            .join(Job, Job.id == JobPosting.job_id)
            .join(JobBoard, JobBoard.id == JobPosting.board_id)
            .where(JobPosting.account_id == account_id)
        )
        if job_id:
            stmt = stmt.where(JobPosting.job_id == job_id)
        if status:
            stmt = stmt.where(JobPosting.status == status)
        nq = normalize_q(q)
        if nq:
            stmt = stmt.where(
                or_(
                    trigram_or(Job.title, JobBoard.name, q=nq, param_name="posting_trgm"),
                    ilike_contains(JobPosting.external_url, nq, param_name="posting_url"),
                    ilike_contains(JobPosting.external_apply_url, nq, param_name="posting_apply_url"),
                    ilike_contains(JobPosting.external_job_id, nq, param_name="posting_ext_id"),
                )
            )
        stmt = stmt.order_by(JobPosting.created_at.desc())
        postings = list(self.db.execute(stmt).scalars().all())
        return self.success([p.to_dict() for p in postings])

    def get_posting(self, account_id: int, posting_id: int) -> dict:
        p = JobPosting.find_by(self.db, id=posting_id, account_id=account_id)
        if not p:
            return self.failure("Posting not found")
        return self.success(p.to_dict())

    def create_posting(self, account_id: int, user_id: int, data: dict) -> dict:
        job_id = data.get("job_id")
        board_id = data.get("board_id")
        if not job_id or not board_id:
            return self.failure("job_id and board_id are required")
        job = Job.find_by(self.db, id=job_id, account_id=account_id)
        if not job or job.deleted_at:
            return self.failure("Job not found")
        board = JobBoard.find_by(self.db, id=board_id)
        if not board or not board.is_active:
            return self.failure("Job board not found or inactive")
        # Enforce unique job+board
        existing = JobPosting.find_by(self.db, job_id=job_id, board_id=board_id)
        if existing:
            return self.failure("This job is already posted to that board")
        now = datetime.now(timezone.utc)
        posting = JobPosting(
            account_id=account_id, job_id=job_id, board_id=board_id,
            job_version_id=data.get("job_version_id"),
            posted_by=user_id,
            external_job_id=data.get("external_job_id"),
            external_url=data.get("external_url"),
            external_apply_url=data.get("external_apply_url"),
            status=data.get("status", "pending"),
            scheduled_at=data.get("scheduled_at"),
            expires_at=data.get("expires_at"),
            cost_amount=data.get("cost_amount"),
            cost_currency=data.get("cost_currency", "USD"),
            created_at=now, updated_at=now,
        )
        posting.save(self.db)
        logger.info(f"JobPostingService.create_posting — id={posting.id} job={job_id} board={board_id}")
        return self.success(posting.to_dict())

    def update_posting(self, account_id: int, posting_id: int, data: dict) -> dict:
        posting = JobPosting.find_by(self.db, id=posting_id, account_id=account_id)
        if not posting:
            return self.failure("Posting not found")
        allowed = ["status", "external_job_id", "external_url", "external_apply_url",
                   "job_version_id", "expires_at", "cost_amount", "cost_currency", "failure_reason"]
        for k in allowed:
            if k in data:
                setattr(posting, k, data[k])
        if data.get("status") == "posted" and not posting.posted_at:
            posting.posted_at = datetime.now(timezone.utc)
        if data.get("status") == "withdrawn":
            posting.withdrawn_at = datetime.now(timezone.utc)
        posting.updated_at = datetime.now(timezone.utc)
        posting.save(self.db)
        logger.info(f"JobPostingService.update_posting — id={posting_id} status={posting.status}")
        return self.success(posting.to_dict())

    def delete_posting(self, account_id: int, posting_id: int) -> dict:
        posting = JobPosting.find_by(self.db, id=posting_id, account_id=account_id)
        if not posting:
            return self.failure("Posting not found")
        posting.destroy(self.db)
        logger.info(f"JobPostingService.delete_posting — deleted id={posting_id}")
        return self.success({"deleted": True})
