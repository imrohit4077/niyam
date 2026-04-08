"""Tenant-scoped communication channels (email SMTP/IMAP first; extensible by type)."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20260409_000017"
down_revision = "20260326_000016"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "communication_channels",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("account_id", sa.BigInteger(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("channel_type", sa.String(length=50), nullable=False),
        sa.Column("provider", sa.String(length=50), nullable=False),
        sa.Column("display_email", sa.String(length=255), nullable=True),
        sa.Column("display_name", sa.String(length=255), nullable=True),
        sa.Column(
            "config",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "credentials",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="pending_verification"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.BigInteger(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_communication_channels_account_type",
        "communication_channels",
        ["account_id", "channel_type"],
    )
    op.create_index(
        "ix_communication_channels_account_id",
        "communication_channels",
        ["account_id"],
    )
    op.create_index(
        "uq_communication_channels_default_per_type",
        "communication_channels",
        ["account_id", "channel_type"],
        unique=True,
        postgresql_where=sa.text("is_default = true AND deleted_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_communication_channels_default_per_type", table_name="communication_channels")
    op.drop_index("ix_communication_channels_account_id", table_name="communication_channels")
    op.drop_index("ix_communication_channels_account_type", table_name="communication_channels")
    op.drop_table("communication_channels")
