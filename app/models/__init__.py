"""
Models package — single source for app-wide model access (Rails convention).
Import all application models here; then use "from app.models import ModelName" everywhere.
Only SQLAlchemy models perform CRUD; schemas are for validation/serialization only.
"""

from app.models.base_model import BaseModel
from app.models.concerns.timestampable import Timestampable
from app.models.concerns.soft_deletable import SoftDeletable
from app.models.concerns.sluggable import Sluggable

from app.models.user import User
from app.models.account import Account
from app.models.account_user import AccountUser
from app.models.role import Role
from app.models.account_user_role import AccountUserRole

__all__ = [
    "BaseModel",
    "Timestampable",
    "SoftDeletable",
    "Sluggable",
    "User",
    "Account",
    "AccountUser",
    "Role",
    "AccountUserRole",
]
