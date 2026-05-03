"""Per-job hiring team (Greenhouse-style) beyond HM/recruiter FKs on jobs."""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260502_000020"
down_revision = "20260418_000019"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "job_team_members",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column(
            "account_id",
            sa.BigInteger(),
            sa.ForeignKey("accounts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "job_id",
            sa.BigInteger(),
            sa.ForeignKey("jobs.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            sa.BigInteger(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("team_role", sa.String(length=50), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_unique_constraint(
        "uq_job_team_members_job_user_role",
        "job_team_members",
        ["job_id", "user_id", "team_role"],
    )
    op.create_index("ix_job_team_members_account_id", "job_team_members", ["account_id"])
    op.create_index("ix_job_team_members_job_id", "job_team_members", ["job_id"])
    op.create_index("ix_job_team_members_user_id", "job_team_members", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_job_team_members_user_id", table_name="job_team_members")
    op.drop_index("ix_job_team_members_job_id", table_name="job_team_members")
    op.drop_index("ix_job_team_members_account_id", table_name="job_team_members")
    op.drop_constraint("uq_job_team_members_job_user_role", "job_team_members", type_="unique")
    op.drop_table("job_team_members")
