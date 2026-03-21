"""E-sign templates: JSON block layout (ATS builder) alongside rendered HTML."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = "20260320_000008"
down_revision = "20260320_000007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "esign_templates",
        sa.Column("content_blocks", JSONB(astext_type=sa.Text()), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("esign_templates", "content_blocks")
