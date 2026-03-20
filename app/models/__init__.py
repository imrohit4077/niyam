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
from app.models.job import Job
from app.models.job_version import JobVersion
from app.models.job_board import JobBoard
from app.models.job_posting import JobPosting
from app.models.application import Application
from app.models.hiring_plan import HiringPlan
from app.models.pipeline_stage import PipelineStage

__all__ = [
    "BaseModel", "Timestampable", "SoftDeletable", "Sluggable",
    "User", "Account", "AccountUser", "Role", "AccountUserRole",
    "Job", "JobVersion", "JobBoard", "JobPosting", "Application",
    "HiringPlan", "PipelineStage",
]
