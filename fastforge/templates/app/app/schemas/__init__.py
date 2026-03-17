"""Pydantic schemas for validation/serialization."""

from pydantic import BaseModel


class PaginationMeta(BaseModel):
    page: int
    per_page: int
    total: int
    total_pages: int
    has_next: bool
    has_prev: bool

__all__ = ["PaginationMeta"]
