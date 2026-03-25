"""Request correlation + log stream (audit vs activity) for SaaS-grade audit trails."""

import sqlalchemy as sa
from alembic import op

revision = "20260326_000016"
down_revision = "20260325_000015"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "audit_log_entries",
        sa.Column("request_id", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "audit_log_entries",
        sa.Column(
            "log_category",
            sa.String(length=24),
            nullable=False,
            server_default="audit",
        ),
    )
    op.add_column(
        "audit_log_entries",
        sa.Column(
            "event_source",
            sa.String(length=16),
            nullable=False,
            server_default="api",
        ),
    )
    op.create_index(
        "ix_audit_log_entries_account_request_id",
        "audit_log_entries",
        ["account_id", "request_id"],
        unique=False,
        postgresql_where=sa.text("request_id IS NOT NULL"),
    )
    op.create_index(
        "ix_audit_log_entries_account_category_created",
        "audit_log_entries",
        ["account_id", "log_category", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_audit_log_entries_account_category_created", table_name="audit_log_entries")
    op.drop_index("ix_audit_log_entries_account_request_id", table_name="audit_log_entries")
    op.drop_column("audit_log_entries", "event_source")
    op.drop_column("audit_log_entries", "log_category")
    op.drop_column("audit_log_entries", "request_id")
