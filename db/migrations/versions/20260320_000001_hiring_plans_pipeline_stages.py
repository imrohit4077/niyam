"""
hiring_plans + pipeline_stages — strategic targets and per-job Kanban columns.

WHY: Tenant-isolated hiring targets (volume, velocity, ownership) and ordered
     pipeline stages with JSONB automation hooks. Applications gain an optional
     pipeline_stage_id for job-specific workflows.

Revision: 20260320_000001
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "20260320_000001"
down_revision = "20260317_000006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "hiring_plans",
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
        sa.Column("target_hires", sa.Integer, nullable=False, server_default="1"),
        sa.Column("hires_made", sa.Integer, nullable=False, server_default="0"),
        sa.Column("deadline", sa.Date(), nullable=True),
        sa.Column(
            "hiring_manager_id",
            sa.BigInteger,
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "primary_recruiter_id",
            sa.BigInteger,
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "plan_status",
            sa.String(50),
            nullable=False,
            server_default="active",
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
    op.create_index(
        "idx_hiring_plan_tenant",
        "hiring_plans",
        ["account_id", "job_id"],
    )
    op.create_unique_constraint(
        "uq_hiring_plans_account_job",
        "hiring_plans",
        ["account_id", "job_id"],
    )

    op.create_table(
        "pipeline_stages",
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
        sa.Column("position", sa.Integer, nullable=False),
        sa.Column("stage_type", sa.String(50), nullable=True),
        sa.Column(
            "automation_rules",
            JSONB,
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
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
    op.create_index(
        "idx_pipeline_job_order",
        "pipeline_stages",
        ["account_id", "job_id", "position"],
    )

    op.add_column(
        "applications",
        sa.Column(
            "pipeline_stage_id",
            sa.BigInteger,
            sa.ForeignKey("pipeline_stages.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_applications_pipeline_stage_id",
        "applications",
        ["pipeline_stage_id"],
    )
    op.create_index(
        "ix_applications_account_job_pipeline",
        "applications",
        ["account_id", "job_id", "pipeline_stage_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_applications_account_job_pipeline", table_name="applications")
    op.drop_index("ix_applications_pipeline_stage_id", table_name="applications")
    op.drop_column("applications", "pipeline_stage_id")

    op.drop_index("idx_pipeline_job_order", table_name="pipeline_stages")
    op.drop_table("pipeline_stages")

    op.drop_constraint("uq_hiring_plans_account_job", "hiring_plans", type_="unique")
    op.drop_index("idx_hiring_plan_tenant", table_name="hiring_plans")
    op.drop_table("hiring_plans")
