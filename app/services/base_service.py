"""
Base service with success/failure result helpers.
Rails equivalent: ApplicationService / service objects
"""

from typing import Any

from sqlalchemy.orm import Session


class BaseService:
    """All service methods return success(data) or failure(error)."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def success(self, data: Any) -> dict[str, Any]:
        """Return success result."""
        return {"ok": True, "data": data}

    def failure(self, error: str) -> dict[str, Any]:
        """Return failure result."""
        return {"ok": False, "error": error}
