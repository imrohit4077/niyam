"""
create_account_user_roles.
Revision: 20260315_152125
"""

from alembic import op
import sqlalchemy as sa

revision = "20260315_152125"
down_revision = "20260315_152123"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "account_user_roles",
        sa.Column("id", sa.BigInteger, primary_key=True),
        sa.Column("account_user_id", sa.BigInteger, sa.ForeignKey("account_users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role_id", sa.BigInteger, sa.ForeignKey("roles.id", ondelete="CASCADE"), nullable=False),
    )
    op.create_unique_constraint(
        "uq_account_user_roles_account_user_role",
        "account_user_roles",
        ["account_user_id", "role_id"],
    )
    op.create_index(
        "ix_account_user_roles_account_user_id",
        "account_user_roles",
        ["account_user_id"],
    )
    op.create_index(
        "ix_account_user_roles_role_id",
        "account_user_roles",
        ["role_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_account_user_roles_role_id", table_name="account_user_roles")
    op.drop_index("ix_account_user_roles_account_user_id", table_name="account_user_roles")
    op.drop_constraint("uq_account_user_roles_account_user_role", "account_user_roles", type_="unique")
    op.drop_table("account_user_roles")
