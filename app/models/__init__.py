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
from app.models.job_attachment import JobAttachment
from app.models.job_version import JobVersion
from app.models.job_board import JobBoard
from app.models.job_posting import JobPosting
from app.models.referral_link import ReferralLink
from app.models.referral_bonus import ReferralBonus
from app.models.audit_log_entry import AuditLogEntry
from app.models.audit_log_delivery_failure import AuditLogDeliveryFailure
from app.models.application import Application
from app.models.custom_attribute_definition import CustomAttributeDefinition
from app.models.hiring_plan import HiringPlan
from app.models.pipeline_stage import PipelineStage
from app.models.interview_plan import InterviewPlan
from app.models.interview_kit import InterviewKit
from app.models.interview_assignment import InterviewAssignment
from app.models.interview_scorecard import InterviewScorecard
from app.models.esign_template import EsignTemplate
from app.models.esign_stage_rule import EsignStageRule
from app.models.esign_request import EsignRequest
from app.models.account_label import AccountLabel
from app.models.label_assignment import LabelAssignment
from app.models.communication_channel import CommunicationChannel
from app.models.department import Department

__all__ = [
    "BaseModel", "Timestampable", "SoftDeletable", "Sluggable",
    "User", "Account", "AccountUser", "Role", "AccountUserRole",
    "Job", "JobAttachment", "JobVersion", "JobBoard", "JobPosting", "Application",
    "HiringPlan", "PipelineStage",
    "InterviewPlan", "InterviewKit", "InterviewAssignment", "InterviewScorecard",
    "EsignTemplate", "EsignStageRule", "EsignRequest",
    "AccountLabel", "LabelAssignment",
    "CommunicationChannel",
    "Department",
    "ReferralLink", "ReferralBonus",
    "AuditLogEntry", "AuditLogDeliveryFailure",
]
