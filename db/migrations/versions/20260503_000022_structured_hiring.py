"""Structured hiring: global attributes, reusable stage templates, kickoff stage selection."""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20260503_000022"
down_revision = "20260503_000021"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "hiring_attributes",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False, primary_key=True),
        sa.Column("account_id", sa.BigInteger(), sa.ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("category", sa.String(length=100), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_hiring_attributes_account_id", "hiring_attributes", ["account_id"])

    op.create_table(
        "hiring_stage_templates",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False, primary_key=True),
        sa.Column("account_id", sa.BigInteger(), sa.ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("stage_type", sa.String(length=50), nullable=True),
        sa.Column(
            "default_interviewer_user_ids",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_hiring_stage_templates_account_id", "hiring_stage_templates", ["account_id"])

    op.create_table(
        "hiring_stage_template_attributes",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False, primary_key=True),
        sa.Column(
            "hiring_stage_template_id",
            sa.BigInteger(),
            sa.ForeignKey("hiring_stage_templates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "hiring_attribute_id",
            sa.BigInteger(),
            sa.ForeignKey("hiring_attributes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(
        "ix_hsta_template_id",
        "hiring_stage_template_attributes",
        ["hiring_stage_template_id"],
    )
    op.create_unique_constraint(
        "uq_hsta_template_attribute",
        "hiring_stage_template_attributes",
        ["hiring_stage_template_id", "hiring_attribute_id"],
    )

    op.add_column(
        "role_kickoff_requests",
        sa.Column(
            "selected_stages",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )


def downgrade() -> None:
    op.drop_column("role_kickoff_requests", "selected_stages")
    op.drop_constraint("uq_hsta_template_attribute", "hiring_stage_template_attributes", type_="unique")
    op.drop_index("ix_hsta_template_id", table_name="hiring_stage_template_attributes")
    op.drop_table("hiring_stage_template_attributes")
    op.drop_index("ix_hiring_stage_templates_account_id", table_name="hiring_stage_templates")
    op.drop_table("hiring_stage_templates")
    op.drop_index("ix_hiring_attributes_account_id", table_name="hiring_attributes")
    op.drop_table("hiring_attributes")
