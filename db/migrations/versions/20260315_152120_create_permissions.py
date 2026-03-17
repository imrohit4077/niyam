"""
create_permissions.
Revision: 20260315_152120
"""

from alembic import op
import sqlalchemy as sa

revision = "20260315_152120_perms"
down_revision = "20260315_152120_roles"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "permissions",
        sa.Column("id", sa.BigInteger, primary_key=True),
        sa.Column("resource", sa.String(length=100), nullable=False),
        sa.Column("action", sa.String(length=100), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=True),
    )
    op.create_unique_constraint(
        "uq_permissions_resource_action",
        "permissions",
        ["resource", "action"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_permissions_resource_action", "permissions", type_="unique")
    op.drop_table("permissions")
