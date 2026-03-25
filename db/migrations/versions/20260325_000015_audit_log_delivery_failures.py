"""When Celery cannot persist an audit row after retries, record the attempt here (admin visibility)."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = "20260325_000015"
down_revision = "20260324_000014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "audit_log_delivery_failures",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("account_id", sa.BigInteger(), nullable=False),
        sa.Column("actor_user_id", sa.BigInteger(), nullable=True),
        sa.Column("attempted_payload", JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("error_message", sa.Text(), nullable=False),
        sa.Column("celery_task_id", sa.String(length=64), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_audit_log_delivery_failures_account_id",
        "audit_log_delivery_failures",
        ["account_id"],
    )
    op.create_index(
        "ix_audit_log_delivery_failures_account_created",
        "audit_log_delivery_failures",
        ["account_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_audit_log_delivery_failures_account_created", table_name="audit_log_delivery_failures")
    op.drop_index("ix_audit_log_delivery_failures_account_id", table_name="audit_log_delivery_failures")
    op.drop_table("audit_log_delivery_failures")
