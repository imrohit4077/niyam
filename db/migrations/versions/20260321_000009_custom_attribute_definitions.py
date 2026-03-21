"""Custom attribute definitions (per account) + application custom_attributes JSONB."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = "20260321_000009"
down_revision = "20260320_000008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "custom_attribute_definitions",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column(
            "account_id",
            sa.BigInteger,
            sa.ForeignKey("accounts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("entity_type", sa.String(32), nullable=False),
        sa.Column("attribute_key", sa.String(64), nullable=False),
        sa.Column("label", sa.String(255), nullable=False),
        sa.Column("field_type", sa.String(32), nullable=False),
        sa.Column("options", JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("required", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column("position", sa.Integer, nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_unique_constraint(
        "uq_custom_attr_def_account_entity_key",
        "custom_attribute_definitions",
        ["account_id", "entity_type", "attribute_key"],
    )
    op.create_index("ix_custom_attr_def_account_entity", "custom_attribute_definitions", ["account_id", "entity_type"])

    op.add_column(
        "applications",
        sa.Column(
            "custom_attributes",
            JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
    )


def downgrade() -> None:
    op.drop_column("applications", "custom_attributes")
    op.drop_index("ix_custom_attr_def_account_entity", table_name="custom_attribute_definitions")
    op.drop_constraint("uq_custom_attr_def_account_entity_key", "custom_attribute_definitions", type_="unique")
    op.drop_table("custom_attribute_definitions")
