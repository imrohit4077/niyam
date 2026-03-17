"""
create_account_users.
Revision: 20260315_152120
"""

from alembic import op
import sqlalchemy as sa

revision = "20260315_152120"
down_revision = "20260315_152119"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "account_users",
        sa.Column("id", sa.BigInteger, primary_key=True),
        sa.Column("account_id", sa.BigInteger, sa.ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.BigInteger, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="active"),
        sa.Column("invited_by", sa.BigInteger, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_unique_constraint(
        "uq_account_users_account_user",
        "account_users",
        ["account_id", "user_id"],
    )
    op.create_index(
        "ix_account_users_account_id",
        "account_users",
        ["account_id"],
    )
    op.create_index(
        "ix_account_users_user_id",
        "account_users",
        ["user_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_account_users_user_id", table_name="account_users")
    op.drop_index("ix_account_users_account_id", table_name="account_users")
    op.drop_constraint("uq_account_users_account_user", "account_users", type_="unique")
    op.drop_table("account_users")
