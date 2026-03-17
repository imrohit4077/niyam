"""
create_role_permissions.
Revision: 20260315_152123
"""

from alembic import op
import sqlalchemy as sa

revision = "20260315_152123"
down_revision = "20260315_152120_perms"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "role_permissions",
        sa.Column("id", sa.BigInteger, primary_key=True),
        sa.Column("role_id", sa.BigInteger, sa.ForeignKey("roles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("permission_id", sa.BigInteger, sa.ForeignKey("permissions.id", ondelete="CASCADE"), nullable=False),
    )
    op.create_unique_constraint(
        "uq_role_permissions_role_permission",
        "role_permissions",
        ["role_id", "permission_id"],
    )
    op.create_index(
        "ix_role_permissions_role_id",
        "role_permissions",
        ["role_id"],
    )
    op.create_index(
        "ix_role_permissions_permission_id",
        "role_permissions",
        ["permission_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_role_permissions_permission_id", table_name="role_permissions")
    op.drop_index("ix_role_permissions_role_id", table_name="role_permissions")
    op.drop_constraint("uq_role_permissions_role_permission", "role_permissions", type_="unique")
    op.drop_table("role_permissions")
