"""
create_roles.
Revision: 20260315_152120
"""

from alembic import op
import sqlalchemy as sa

revision = "20260315_152120_roles"
down_revision = "20260315_152120"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "roles",
        sa.Column("id", sa.BigInteger, primary_key=True),
        sa.Column("account_id", sa.BigInteger, sa.ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("slug", sa.String(length=100), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_unique_constraint(
        "uq_roles_account_slug",
        "roles",
        ["account_id", "slug"],
    )
    op.create_index(
        "ix_roles_account_id",
        "roles",
        ["account_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_roles_account_id", table_name="roles")
    op.drop_constraint("uq_roles_account_slug", "roles", type_="unique")
    op.drop_table("roles")
