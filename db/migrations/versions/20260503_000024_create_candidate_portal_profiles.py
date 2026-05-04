"""Create candidate_portal_profiles."""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260503_000024"
down_revision = "20260503_000023"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "candidate_portal_profiles",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("account_id", sa.BigInteger(), sa.ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=True),
        sa.Column("phone", sa.String(length=80), nullable=True),
        sa.Column("location", sa.String(length=255), nullable=True),
        sa.Column("headline", sa.String(length=255), nullable=True),
        sa.Column("summary", sa.String(length=5000), nullable=True),
        sa.Column("linkedin_url", sa.String(length=1024), nullable=True),
        sa.Column("portfolio_url", sa.String(length=1024), nullable=True),
        sa.Column("profile_picture_url", sa.String(length=1024), nullable=True),
        sa.Column("resume_url", sa.String(length=1024), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="active"),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_candidate_portal_profiles_account_email",
        "candidate_portal_profiles",
        ["account_id", "email"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_candidate_portal_profiles_account_email", table_name="candidate_portal_profiles")
    op.drop_table("candidate_portal_profiles")
