"""Account-level labels (Chatwoot-style) + assignments on jobs & applications + search document."""

import sqlalchemy as sa
from alembic import op

revision = "20260321_000011"
down_revision = "20260321_000010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "account_labels",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("account_id", sa.BigInteger(), nullable=False),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("color", sa.String(length=32), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("account_id", "title", name="uq_account_labels_account_title"),
    )
    op.create_index("ix_account_labels_account_id", "account_labels", ["account_id"])

    op.create_table(
        "label_assignments",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("account_id", sa.BigInteger(), nullable=False),
        sa.Column("label_id", sa.BigInteger(), nullable=False),
        sa.Column("labelable_type", sa.String(length=50), nullable=False),
        sa.Column("labelable_id", sa.BigInteger(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["label_id"], ["account_labels.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("label_id", "labelable_type", "labelable_id", name="uq_label_assignment_entity"),
    )
    op.create_index(
        "ix_label_assignments_lookup",
        "label_assignments",
        ["account_id", "labelable_type", "labelable_id"],
    )
    op.create_index("ix_label_assignments_label_id", "label_assignments", ["label_id"])

    op.add_column(
        "jobs",
        sa.Column("label_search_document", sa.Text(), server_default="", nullable=False),
    )
    op.add_column(
        "applications",
        sa.Column("label_search_document", sa.Text(), server_default="", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("applications", "label_search_document")
    op.drop_column("jobs", "label_search_document")
    op.drop_index("ix_label_assignments_label_id", table_name="label_assignments")
    op.drop_index("ix_label_assignments_lookup", table_name="label_assignments")
    op.drop_table("label_assignments")
    op.drop_index("ix_account_labels_account_id", table_name="account_labels")
    op.drop_table("account_labels")
