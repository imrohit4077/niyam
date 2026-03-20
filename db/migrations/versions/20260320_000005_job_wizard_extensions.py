"""Job wizard: extended fields, job_config JSONB, attachments, interview plan duration/format."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "20260320_000005"
down_revision = "20260320_000004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "jobs",
        sa.Column("open_positions", sa.Integer(), nullable=False, server_default="1"),
    )
    op.add_column("jobs", sa.Column("bonus_incentives", sa.Text(), nullable=True))
    op.add_column("jobs", sa.Column("budget_approval_status", sa.String(80), nullable=True))
    op.add_column("jobs", sa.Column("cost_center", sa.String(128), nullable=True))
    op.add_column("jobs", sa.Column("hiring_budget_id", sa.String(128), nullable=True))
    op.add_column(
        "jobs",
        sa.Column("hiring_manager_user_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
    )
    op.add_column(
        "jobs",
        sa.Column("recruiter_user_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
    )
    op.add_column("jobs", sa.Column("requisition_id", sa.String(128), nullable=True))
    op.add_column(
        "jobs",
        sa.Column(
            "job_config",
            JSONB,
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
    )

    op.create_table(
        "job_attachments",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("account_id", sa.BigInteger(), sa.ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("job_id", sa.BigInteger(), sa.ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("doc_type", sa.String(80), nullable=True),
        sa.Column("file_url", sa.String(1024), nullable=False),
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
    op.create_index("idx_job_attachments_job", "job_attachments", ["job_id"])

    op.add_column("interview_plans", sa.Column("duration_minutes", sa.Integer(), nullable=True))
    op.add_column("interview_plans", sa.Column("interview_format", sa.String(20), nullable=True))


def downgrade() -> None:
    op.drop_column("interview_plans", "interview_format")
    op.drop_column("interview_plans", "duration_minutes")
    op.drop_index("idx_job_attachments_job", table_name="job_attachments")
    op.drop_table("job_attachments")
    op.drop_column("jobs", "job_config")
    op.drop_column("jobs", "requisition_id")
    op.drop_column("jobs", "recruiter_user_id")
    op.drop_column("jobs", "hiring_manager_user_id")
    op.drop_column("jobs", "hiring_budget_id")
    op.drop_column("jobs", "cost_center")
    op.drop_column("jobs", "budget_approval_status")
    op.drop_column("jobs", "bonus_incentives")
    op.drop_column("jobs", "open_positions")
