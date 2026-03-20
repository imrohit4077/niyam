"""Add scorecard_reminder_sent_at for idempotent post-interview nudges."""

from alembic import op
import sqlalchemy as sa

revision = "20260320_000003"
down_revision = "20260320_000002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "interview_assignments",
        sa.Column("scorecard_reminder_sent_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("interview_assignments", "scorecard_reminder_sent_at")
