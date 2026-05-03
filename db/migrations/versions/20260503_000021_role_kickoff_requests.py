"""Role kickoff requests (Greenhouse-style HM → recruiter alignment before job creation)."""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20260503_000021"
down_revision = "20260502_000020"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "role_kickoff_requests",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("account_id", sa.BigInteger(), sa.ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False),
        sa.Column(
            "created_by_user_id",
            sa.BigInteger(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "assigned_recruiter_user_id",
            sa.BigInteger(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="submitted"),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("department", sa.String(length=100), nullable=True),
        sa.Column("open_positions", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("location", sa.String(length=255), nullable=True),
        sa.Column("why_hiring", sa.Text(), nullable=True),
        sa.Column("expectation_30_60_90", sa.Text(), nullable=True),
        sa.Column("success_definition", sa.Text(), nullable=True),
        sa.Column(
            "skills_must_have",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "skills_nice_to_have",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("experience_note", sa.Text(), nullable=True),
        sa.Column("salary_min", sa.Numeric(12, 2), nullable=True),
        sa.Column("salary_max", sa.Numeric(12, 2), nullable=True),
        sa.Column("salary_currency", sa.String(length=10), nullable=False, server_default="USD"),
        sa.Column("budget_notes", sa.Text(), nullable=True),
        sa.Column("interview_rounds", sa.Integer(), nullable=True),
        sa.Column("interviewers_note", sa.Text(), nullable=True),
        sa.Column(
            "converted_job_id",
            sa.BigInteger(),
            sa.ForeignKey("jobs.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("recruiter_feedback", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_role_kickoff_requests_account_id", "role_kickoff_requests", ["account_id"])
    op.create_index("ix_role_kickoff_requests_created_by", "role_kickoff_requests", ["created_by_user_id"])
    op.create_index(
        "ix_role_kickoff_requests_assigned_recruiter",
        "role_kickoff_requests",
        ["assigned_recruiter_user_id"],
    )
    op.create_index("ix_role_kickoff_requests_status", "role_kickoff_requests", ["status"])

    op.add_column(
        "jobs",
        sa.Column(
            "role_kickoff_request_id",
            sa.BigInteger(),
            sa.ForeignKey("role_kickoff_requests.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index("ix_jobs_role_kickoff_request_id", "jobs", ["role_kickoff_request_id"])


def downgrade() -> None:
    op.drop_index("ix_jobs_role_kickoff_request_id", table_name="jobs")
    op.drop_column("jobs", "role_kickoff_request_id")
    op.drop_index("ix_role_kickoff_requests_status", table_name="role_kickoff_requests")
    op.drop_index("ix_role_kickoff_requests_assigned_recruiter", table_name="role_kickoff_requests")
    op.drop_index("ix_role_kickoff_requests_created_by", table_name="role_kickoff_requests")
    op.drop_index("ix_role_kickoff_requests_account_id", table_name="role_kickoff_requests")
    op.drop_table("role_kickoff_requests")
