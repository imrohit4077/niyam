"""
create_job_postings — Distribution tracking (where each job is posted).

WHY: One job → many boards. This is the campaign layer.
     Tracks the lifecycle of each posting: pending → posted → expired/failed.
     Stores the external ID returned by the board API so we can
     update/unpublish later. Tenant-scoped via account_id.

Revision: 20260317_000004
"""

from alembic import op
import sqlalchemy as sa

revision = "20260317_000004"
down_revision = "20260317_000003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "job_postings",
        # ── Identity ──────────────────────────────────────────────
        sa.Column("id", sa.BigInteger, primary_key=True),
        sa.Column(
            "account_id",
            sa.BigInteger,
            sa.ForeignKey("accounts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "job_id",
            sa.BigInteger,
            sa.ForeignKey("jobs.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "job_version_id",
            sa.BigInteger,
            sa.ForeignKey("job_versions.id", ondelete="SET NULL"),
            nullable=True,                                              # which version was posted
        ),
        sa.Column(
            "board_id",
            sa.BigInteger,
            sa.ForeignKey("job_boards.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "posted_by",
            sa.BigInteger,
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),

        # ── External reference ────────────────────────────────────
        sa.Column("external_job_id", sa.String(255), nullable=True),   # ID returned by board API
        sa.Column("external_url", sa.String(512), nullable=True),       # public URL on the board
        sa.Column("external_apply_url", sa.String(512), nullable=True), # direct apply link if different

        # ── Status & lifecycle ────────────────────────────────────
        sa.Column("status", sa.String(50), nullable=False,
                  server_default="pending"),                            # pending | posted | paused | expired | failed | withdrawn
        sa.Column("failure_reason", sa.Text, nullable=True),           # API error message on failure
        sa.Column("retry_count", sa.Integer, nullable=False, server_default="0"),

        # ── Scheduling ────────────────────────────────────────────
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),  # future publish
        sa.Column("posted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("withdrawn_at", sa.DateTime(timezone=True), nullable=True),

        # ── Cost tracking ─────────────────────────────────────────
        sa.Column("cost_amount", sa.Numeric(10, 2), nullable=True),
        sa.Column("cost_currency", sa.String(10), nullable=True, server_default="USD"),

        # ── Timestamps ───────────────────────────────────────────
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
    )

    # One active posting per job+board at a time
    op.create_unique_constraint(
        "uq_job_postings_job_board", "job_postings", ["job_id", "board_id"]
    )

    op.create_index("ix_job_postings_account_id",     "job_postings", ["account_id"])
    op.create_index("ix_job_postings_job_id",         "job_postings", ["job_id"])
    op.create_index("ix_job_postings_board_id",       "job_postings", ["board_id"])
    op.create_index("ix_job_postings_status",         "job_postings", ["status"])
    op.create_index("ix_job_postings_job_version_id", "job_postings", ["job_version_id"])


def downgrade() -> None:
    op.drop_index("ix_job_postings_job_version_id", table_name="job_postings")
    op.drop_index("ix_job_postings_status",         table_name="job_postings")
    op.drop_index("ix_job_postings_board_id",       table_name="job_postings")
    op.drop_index("ix_job_postings_job_id",         table_name="job_postings")
    op.drop_index("ix_job_postings_account_id",     table_name="job_postings")
    op.drop_constraint("uq_job_postings_job_board", "job_postings", type_="unique")
    op.drop_table("job_postings")
