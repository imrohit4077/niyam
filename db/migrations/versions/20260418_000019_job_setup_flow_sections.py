"""Job setup flow sections + fields (account-scoped; replaces YAML catalog)."""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260418_000019"
down_revision = "20260409_000018"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "job_setup_flow_sections",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("account_id", sa.BigInteger(), nullable=False),
        sa.Column("section_key", sa.String(length=64), nullable=False),
        sa.Column("label", sa.String(length=255), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_enabled", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("built_in", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("account_id", "section_key", name="uq_job_setup_flow_sections_account_key"),
    )
    op.create_index(
        "ix_job_setup_flow_sections_account_position",
        "job_setup_flow_sections",
        ["account_id", "position"],
    )

    op.create_table(
        "job_setup_flow_fields",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("account_id", sa.BigInteger(), nullable=False),
        sa.Column("section_id", sa.BigInteger(), nullable=False),
        sa.Column("field_key", sa.String(length=128), nullable=False),
        sa.Column("label", sa.String(length=255), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_enabled", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("built_in", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["section_id"], ["job_setup_flow_sections.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("section_id", "field_key", name="uq_job_setup_flow_fields_section_key"),
    )
    op.create_index(
        "ix_job_setup_flow_fields_account_section",
        "job_setup_flow_fields",
        ["account_id", "section_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_job_setup_flow_fields_account_section", table_name="job_setup_flow_fields")
    op.drop_table("job_setup_flow_fields")
    op.drop_index("ix_job_setup_flow_sections_account_position", table_name="job_setup_flow_sections")
    op.drop_table("job_setup_flow_sections")
