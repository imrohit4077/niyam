"""Remove stage_type from hiring_stage_templates (structured hiring stages)."""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260503_000023"
down_revision = "20260503_000022"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("hiring_stage_templates", "stage_type")


def downgrade() -> None:
    op.add_column(
        "hiring_stage_templates",
        sa.Column("stage_type", sa.String(length=50), nullable=True),
    )
