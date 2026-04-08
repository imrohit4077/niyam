"""
Pydantic schemas for request/response validation and serialization only.
Rails equivalent: strong parameters + serializers. All CRUD goes through SQLAlchemy models.
"""

from pydantic import BaseModel, EmailStr


class PaginationMeta(BaseModel):
    """Pagination metadata for list endpoints."""

    page: int
    per_page: int
    total: int
    total_pages: int
    has_next: bool
    has_prev: bool


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


from app.schemas.communication_channels import CommunicationChannelCreate, CommunicationChannelUpdate

__all__ = [
    "PaginationMeta",
    "LoginRequest",
    "RefreshRequest",
    "CommunicationChannelCreate",
    "CommunicationChannelUpdate",
]
