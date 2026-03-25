"""Append-only audit_log_entries for API activity; enforced by trigger + optional DB privileges."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = "20260324_000013"
down_revision = "20260324_000012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "audit_log_entries",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("account_id", sa.BigInteger(), nullable=False),
        sa.Column("actor_user_id", sa.BigInteger(), nullable=True),
        sa.Column("http_method", sa.String(length=16), nullable=False),
        sa.Column("path", sa.String(length=2048), nullable=False),
        sa.Column("status_code", sa.Integer(), nullable=False),
        sa.Column("resource_type", sa.String(length=128), nullable=True),
        sa.Column("resource_id", sa.BigInteger(), nullable=True),
        sa.Column("metadata", JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("user_agent", sa.String(length=512), nullable=True),
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
    op.create_index("ix_audit_log_entries_account_id", "audit_log_entries", ["account_id"])
    op.create_index(
        "ix_audit_log_entries_account_created",
        "audit_log_entries",
        ["account_id", "created_at"],
    )

    # Append-only: block UPDATE/DELETE at the database layer (same as REVOKE UPDATE, DELETE on app role).
    op.execute(
        """
        CREATE OR REPLACE FUNCTION audit_log_entries_append_only_fn()
        RETURNS trigger AS $$
        BEGIN
          RAISE EXCEPTION 'audit_log_entries is append-only: updates and deletes are not allowed';
        END;
        $$ LANGUAGE plpgsql;
        """
    )
    op.execute(
        """
        CREATE TRIGGER audit_log_entries_append_only
        BEFORE UPDATE OR DELETE ON audit_log_entries
        FOR EACH ROW EXECUTE PROCEDURE audit_log_entries_append_only_fn();
        """
    )

    # Production: also run as a privileged user, e.g.
    # REVOKE UPDATE, DELETE ON audit_log_entries FROM app_user;
    # GRANT SELECT, INSERT ON audit_log_entries TO app_user;


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS audit_log_entries_append_only ON audit_log_entries;")
    op.execute("DROP FUNCTION IF EXISTS audit_log_entries_append_only_fn();")
    op.drop_table("audit_log_entries")
