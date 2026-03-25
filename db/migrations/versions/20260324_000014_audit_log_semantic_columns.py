"""Semantic audit fields (action, resource, severity, old/new JSON) + nullable HTTP columns for event-only rows."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = "20260324_000014"
down_revision = "20260324_000013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("audit_log_entries", "http_method", existing_type=sa.String(length=16), nullable=True)
    op.alter_column("audit_log_entries", "path", existing_type=sa.String(length=2048), nullable=True)
    op.alter_column("audit_log_entries", "status_code", existing_type=sa.Integer(), nullable=True)

    op.add_column(
        "audit_log_entries",
        sa.Column("action", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "audit_log_entries",
        sa.Column("resource", sa.String(length=128), nullable=True),
    )
    op.add_column(
        "audit_log_entries",
        sa.Column("severity", sa.String(length=32), nullable=True),
    )
    op.add_column("audit_log_entries", sa.Column("old_value", JSONB(), nullable=True))
    op.add_column("audit_log_entries", sa.Column("new_value", JSONB(), nullable=True))

    op.create_index(
        "ix_audit_log_entries_account_action",
        "audit_log_entries",
        ["account_id", "action"],
    )


def downgrade() -> None:
    op.drop_index("ix_audit_log_entries_account_action", table_name="audit_log_entries")
    op.drop_column("audit_log_entries", "new_value")
    op.drop_column("audit_log_entries", "old_value")
    op.drop_column("audit_log_entries", "severity")
    op.drop_column("audit_log_entries", "resource")
    op.drop_column("audit_log_entries", "action")

    op.alter_column("audit_log_entries", "status_code", existing_type=sa.Integer(), nullable=False)
    op.alter_column("audit_log_entries", "path", existing_type=sa.String(length=2048), nullable=False)
    op.alter_column("audit_log_entries", "http_method", existing_type=sa.String(length=16), nullable=False)
