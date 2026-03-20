"""Job scorecard criteria template + denormalized application/job on scorecards + qualitative fields."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "20260320_000004"
down_revision = "20260320_000003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "jobs",
        sa.Column(
            "scorecard_criteria",
            JSONB,
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )

    op.add_column(
        "scorecards",
        sa.Column(
            "application_id",
            sa.BigInteger,
            sa.ForeignKey("applications.id", ondelete="CASCADE"),
            nullable=True,
        ),
    )
    op.add_column(
        "scorecards",
        sa.Column(
            "job_id",
            sa.BigInteger,
            sa.ForeignKey("jobs.id", ondelete="CASCADE"),
            nullable=True,
        ),
    )
    op.add_column("scorecards", sa.Column("pros", sa.Text(), nullable=True))
    op.add_column("scorecards", sa.Column("cons", sa.Text(), nullable=True))
    op.add_column("scorecards", sa.Column("internal_notes", sa.Text(), nullable=True))

    op.execute(
        """
        UPDATE scorecards AS s
        SET application_id = ia.application_id,
            job_id = a.job_id
        FROM interview_assignments AS ia
        JOIN applications AS a
          ON a.id = ia.application_id AND a.account_id = ia.account_id
        WHERE s.assignment_id = ia.id
          AND s.account_id = ia.account_id
        """
    )

    op.alter_column("scorecards", "application_id", nullable=False)
    op.alter_column("scorecards", "job_id", nullable=False)

    op.create_index(
        "idx_scorecards_account_application",
        "scorecards",
        ["account_id", "application_id"],
    )
    op.create_index(
        "idx_scorecards_account_job",
        "scorecards",
        ["account_id", "job_id"],
    )


def downgrade() -> None:
    op.drop_index("idx_scorecards_account_job", table_name="scorecards")
    op.drop_index("idx_scorecards_account_application", table_name="scorecards")
    op.drop_column("scorecards", "internal_notes")
    op.drop_column("scorecards", "cons")
    op.drop_column("scorecards", "pros")
    op.drop_column("scorecards", "job_id")
    op.drop_column("scorecards", "application_id")
    op.drop_column("jobs", "scorecard_criteria")
