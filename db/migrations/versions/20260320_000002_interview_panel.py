"""
interview_plans, interview_kits, interview_assignments, scorecards — signal-based hiring.

WHY: Blueprint (plan per job/stage), kit (questions JSONB), assignments (workflow),
     scorecards (structured feedback). Tenant-scoped; composite indexes for hot paths.

Revision: 20260320_000002
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "20260320_000002"
down_revision = "20260320_000001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "interview_plans",
        sa.Column("id", sa.BigInteger, primary_key=True),
        sa.Column(
            "account_id",
            sa.BigInteger,
            sa.ForeignKey("accounts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "job_id",
            sa.BigInteger,
            sa.ForeignKey("jobs.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column(
            "pipeline_stage_id",
            sa.BigInteger,
            sa.ForeignKey("pipeline_stages.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("position", sa.Integer, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "idx_interview_plans_account_job",
        "interview_plans",
        ["account_id", "job_id"],
    )
    op.create_index(
        "idx_interview_plans_account_job_stage",
        "interview_plans",
        ["account_id", "job_id", "pipeline_stage_id"],
    )
    op.create_index(
        "idx_interview_plans_job_position",
        "interview_plans",
        ["job_id", "position"],
    )

    op.create_table(
        "interview_kits",
        sa.Column("id", sa.BigInteger, primary_key=True),
        sa.Column(
            "account_id",
            sa.BigInteger,
            sa.ForeignKey("accounts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "interview_plan_id",
            sa.BigInteger,
            sa.ForeignKey("interview_plans.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("focus_area", sa.Text, nullable=True),
        sa.Column("instructions", sa.Text, nullable=True),
        sa.Column(
            "questions",
            JSONB,
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_unique_constraint(
        "uq_interview_kits_plan",
        "interview_kits",
        ["interview_plan_id"],
    )
    op.create_index(
        "idx_interview_kits_account_plan",
        "interview_kits",
        ["account_id", "interview_plan_id"],
    )

    op.create_table(
        "interview_assignments",
        sa.Column("id", sa.BigInteger, primary_key=True),
        sa.Column(
            "account_id",
            sa.BigInteger,
            sa.ForeignKey("accounts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "application_id",
            sa.BigInteger,
            sa.ForeignKey("applications.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "interview_plan_id",
            sa.BigInteger,
            sa.ForeignKey("interview_plans.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "interviewer_id",
            sa.BigInteger,
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "status",
            sa.String(50),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("interview_ends_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("calendar_event_url", sa.String(1024), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_unique_constraint(
        "uq_interview_assignments_app_plan",
        "interview_assignments",
        ["application_id", "interview_plan_id"],
    )
    op.create_index(
        "idx_interview_assignments_account_interviewer_status",
        "interview_assignments",
        ["account_id", "interviewer_id", "status"],
    )
    op.create_index(
        "idx_interview_assignments_account_scheduled",
        "interview_assignments",
        ["account_id", "scheduled_at"],
    )
    op.create_index(
        "idx_interview_assignments_application",
        "interview_assignments",
        ["application_id"],
    )

    op.create_table(
        "scorecards",
        sa.Column("id", sa.BigInteger, primary_key=True),
        sa.Column(
            "account_id",
            sa.BigInteger,
            sa.ForeignKey("accounts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "assignment_id",
            sa.BigInteger,
            sa.ForeignKey("interview_assignments.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "interviewer_id",
            sa.BigInteger,
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("overall_recommendation", sa.String(20), nullable=False),
        sa.Column(
            "criteria_scores",
            JSONB,
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_unique_constraint(
        "uq_scorecards_assignment_interviewer",
        "scorecards",
        ["assignment_id", "interviewer_id"],
    )
    op.create_index(
        "idx_scorecards_account_assignment",
        "scorecards",
        ["account_id", "assignment_id"],
    )


def downgrade() -> None:
    op.drop_index("idx_scorecards_account_assignment", table_name="scorecards")
    op.drop_constraint("uq_scorecards_assignment_interviewer", "scorecards", type_="unique")
    op.drop_table("scorecards")

    op.drop_index("idx_interview_assignments_application", table_name="interview_assignments")
    op.drop_index("idx_interview_assignments_account_scheduled", table_name="interview_assignments")
    op.drop_index("idx_interview_assignments_account_interviewer_status", table_name="interview_assignments")
    op.drop_constraint("uq_interview_assignments_app_plan", "interview_assignments", type_="unique")
    op.drop_table("interview_assignments")

    op.drop_index("idx_interview_kits_account_plan", table_name="interview_kits")
    op.drop_constraint("uq_interview_kits_plan", "interview_kits", type_="unique")
    op.drop_table("interview_kits")

    op.drop_index("idx_interview_plans_job_position", table_name="interview_plans")
    op.drop_index("idx_interview_plans_account_job_stage", table_name="interview_plans")
    op.drop_index("idx_interview_plans_account_job", table_name="interview_plans")
    op.drop_table("interview_plans")
