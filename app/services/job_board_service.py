"""JobBoardService — CRUD for job boards (global, admin-managed)."""
import re
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.job_board import JobBoard
from app.helpers.logger import get_logger
from app.services.base_service import BaseService

logger = get_logger(__name__)


def _slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


class JobBoardService(BaseService):
    def list_boards(self, active_only: bool = False) -> dict:
        stmt = select(JobBoard)
        if active_only:
            stmt = stmt.where(JobBoard.is_active == True)
        stmt = stmt.order_by(JobBoard.name)
        boards = list(self.db.execute(stmt).scalars().all())
        logger.info(f"JobBoardService.list_boards — returned {len(boards)}")
        return self.success([b.to_dict() for b in boards])

    def get_board(self, board_id: int) -> dict:
        board = JobBoard.find_by(self.db, id=board_id)
        if not board:
            return self.failure("Job board not found")
        return self.success(board.to_dict())

    def create_board(self, data: dict) -> dict:
        name = (data.get("name") or "").strip()
        if not name:
            return self.failure("name is required")
        slug = data.get("slug") or _slugify(name)
        if JobBoard.find_by(self.db, slug=slug):
            return self.failure(f"Board with slug '{slug}' already exists")
        now = datetime.now(timezone.utc)
        board = JobBoard(
            name=name, slug=slug,
            logo_url=data.get("logo_url"),
            website_url=data.get("website_url"),
            integration_type=data.get("integration_type", "manual"),
            api_endpoint=data.get("api_endpoint"),
            api_version=data.get("api_version"),
            auth_type=data.get("auth_type"),
            supports_apply_redirect=data.get("supports_apply_redirect", True),
            supports_direct_apply=data.get("supports_direct_apply", False),
            supported_countries=data.get("supported_countries", []),
            supported_job_types=data.get("supported_job_types", []),
            required_fields=data.get("required_fields", []),
            is_active=data.get("is_active", True),
            is_premium=data.get("is_premium", False),
            created_at=now, updated_at=now,
        )
        board.save(self.db)
        logger.info(f"JobBoardService.create_board — created id={board.id} slug={board.slug}")
        return self.success(board.to_dict())

    def update_board(self, board_id: int, data: dict) -> dict:
        board = JobBoard.find_by(self.db, id=board_id)
        if not board:
            return self.failure("Job board not found")
        allowed = ["name", "logo_url", "website_url", "integration_type", "api_endpoint",
                   "api_version", "auth_type", "supports_apply_redirect", "supports_direct_apply",
                   "supported_countries", "supported_job_types", "required_fields",
                   "is_active", "is_premium"]
        for k in allowed:
            if k in data:
                setattr(board, k, data[k])
        board.updated_at = datetime.now(timezone.utc)
        board.save(self.db)
        logger.info(f"JobBoardService.update_board — updated id={board_id}")
        return self.success(board.to_dict())

    def delete_board(self, board_id: int) -> dict:
        board = JobBoard.find_by(self.db, id=board_id)
        if not board:
            return self.failure("Job board not found")
        board.destroy(self.db)
        logger.info(f"JobBoardService.delete_board — deleted id={board_id}")
        return self.success({"deleted": True})
