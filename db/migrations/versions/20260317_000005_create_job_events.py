"""
create_job_events — Immutable analytics event stream.

WHY: Counters lie. Event logs tell the truth.
     Every candidate interaction is appended here — never updated.
     This powers A/B test analysis (which version → more applies?)
     and channel ROI (which board → best conversion?).

     event_type values:
       view        — candidate opened the job page
       click       — candidate clicked "Apply"
       apply       — candidate submitted application
       share       — candidate shared the job link
       impression  — job appeared in search results (board-reported)

Revision: 20260317_000005
"""

from alembic import op
import sqlalchemy as sa

revision = "20260317_000005"
down_revision = "20260317_000004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "job_events",
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
            nullable=True,                                              # which A/B variant was shown
        ),
        sa.Column(
            "job_posting_id",
            sa.BigInteger,
            sa.ForeignKey("job_postings.id", ondelete="SET NULL"),
            nullable=True,                                              # which board posting triggered this
        ),
        sa.Column(
            "board_id",
            sa.BigInteger,
            sa.ForeignKey("job_boards.id", ondelete="SET NULL"),
            nullable=True,                                              # denormalized for fast queries
        ),
        sa.Column(
            "candidate_id",
            sa.BigInteger,
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,                                              # null = anonymous visitor
        ),

        # ── Event ─────────────────────────────────────────────────
        sa.Column("event_type", sa.String(50), nullable=False),        # view | click | apply | share | impression
        sa.Column("event_metadata", sa.JSON, nullable=False,
                  server_default=sa.text("'{}'")),                     # {referrer, utm_source, device, …}

        # ── Attribution ───────────────────────────────────────────
        sa.Column("session_id", sa.String(128), nullable=True),        # browser session for funnel stitching
        sa.Column("ip_address", sa.String(45), nullable=True),         # IPv4/IPv6
        sa.Column("user_agent", sa.String(512), nullable=True),
        sa.Column("referrer_url", sa.String(512), nullable=True),
        sa.Column("utm_source", sa.String(100), nullable=True),
        sa.Column("utm_medium", sa.String(100), nullable=True),
        sa.Column("utm_campaign", sa.String(100), nullable=True),
        sa.Column("country_code", sa.String(2), nullable=True),        # ISO 3166-1 alpha-2
        sa.Column("device_type", sa.String(20), nullable=True),        # desktop | mobile | tablet

        # ── Timestamp (append-only, no updated_at) ───────────────
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
    )

    # Analytics query indexes
    op.create_index("ix_job_events_account_id",      "job_events", ["account_id"])
    op.create_index("ix_job_events_job_id",          "job_events", ["job_id"])
    op.create_index("ix_job_events_job_version_id",  "job_events", ["job_version_id"])
    op.create_index("ix_job_events_board_id",        "job_events", ["board_id"])
    op.create_index("ix_job_events_event_type",      "job_events", ["event_type"])
    op.create_index("ix_job_events_created_at",      "job_events", ["created_at"])
    op.create_index("ix_job_events_candidate_id",    "job_events", ["candidate_id"])
    # Composite: most common analytics query
    op.create_index(
        "ix_job_events_job_version_event",
        "job_events",
        ["job_id", "job_version_id", "event_type"],
    )


def downgrade() -> None:
    op.drop_index("ix_job_events_job_version_event", table_name="job_events")
    op.drop_index("ix_job_events_candidate_id",      table_name="job_events")
    op.drop_index("ix_job_events_created_at",        table_name="job_events")
    op.drop_index("ix_job_events_event_type",        table_name="job_events")
    op.drop_index("ix_job_events_board_id",          table_name="job_events")
    op.drop_index("ix_job_events_job_version_id",    table_name="job_events")
    op.drop_index("ix_job_events_job_id",            table_name="job_events")
    op.drop_index("ix_job_events_account_id",        table_name="job_events")
    op.drop_table("job_events")
