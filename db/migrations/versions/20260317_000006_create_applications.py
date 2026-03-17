"""
create_applications — Final business outcome (a candidate applied).

WHY: This is the conversion event. Every row = one candidate applied
     to one job. We track WHERE they came from (board + version) so
     recruiters can answer: "Which channel gives the best candidates?"
     Full pipeline stage history is tracked via status + stage_history.

Revision: 20260317_000006
"""

from alembic import op
import sqlalchemy as sa

revision = "20260317_000006"
down_revision = "20260317_000005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "applications",
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
            "candidate_id",
            sa.BigInteger,
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),

        # ── Attribution (where did they come from?) ───────────────
        sa.Column(
            "source_board_id",
            sa.BigInteger,
            sa.ForeignKey("job_boards.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "source_version_id",
            sa.BigInteger,
            sa.ForeignKey("job_versions.id", ondelete="SET NULL"),
            nullable=True,                                              # which A/B version they saw
        ),
        sa.Column(
            "source_posting_id",
            sa.BigInteger,
            sa.ForeignKey("job_postings.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("source_type", sa.String(50), nullable=True,
                  server_default="direct"),                            # direct | board | referral | social | email
        sa.Column("referral_user_id", sa.BigInteger,
                  sa.ForeignKey("users.id", ondelete="SET NULL"),
                  nullable=True),                                      # who referred this candidate

        # ── Candidate info snapshot ───────────────────────────────
        sa.Column("candidate_name", sa.String(255), nullable=True),   # snapshot at apply time
        sa.Column("candidate_email", sa.String(255), nullable=False),
        sa.Column("candidate_phone", sa.String(50), nullable=True),
        sa.Column("candidate_location", sa.String(255), nullable=True),
        sa.Column("resume_url", sa.String(512), nullable=True),
        sa.Column("cover_letter", sa.Text, nullable=True),
        sa.Column("linkedin_url", sa.String(512), nullable=True),
        sa.Column("portfolio_url", sa.String(512), nullable=True),
        sa.Column("custom_answers", sa.JSON, nullable=False,
                  server_default=sa.text("'{}'")),                     # answers to job-specific questions

        # ── Pipeline stage ────────────────────────────────────────
        sa.Column("status", sa.String(50), nullable=False,
                  server_default="applied"),                           # applied | screening | interview | offer | hired | rejected | withdrawn
        sa.Column("stage_history", sa.JSON, nullable=False,
                  server_default=sa.text("'[]'")),                     # [{stage, changed_by, changed_at}]
        sa.Column(
            "assigned_to",
            sa.BigInteger,
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,                                             # recruiter owner
        ),
        sa.Column("rejection_reason", sa.String(255), nullable=True),
        sa.Column("rejection_note", sa.Text, nullable=True),

        # ── Scoring ───────────────────────────────────────────────
        sa.Column("score", sa.Numeric(5, 2), nullable=True),          # 0.00–100.00 AI/manual score
        sa.Column("score_breakdown", sa.JSON, nullable=False,
                  server_default=sa.text("'{}'")),                     # {skills: 80, experience: 70}
        sa.Column("tags", sa.JSON, nullable=False,
                  server_default=sa.text("'[]'")),                     # recruiter labels

        # ── Soft delete ───────────────────────────────────────────
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),

        # ── Timestamps ───────────────────────────────────────────
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
    )

    # One application per candidate per job
    op.create_unique_constraint(
        "uq_applications_job_candidate",
        "applications",
        ["job_id", "candidate_email"],
    )

    op.create_index("ix_applications_account_id",       "applications", ["account_id"])
    op.create_index("ix_applications_job_id",           "applications", ["job_id"])
    op.create_index("ix_applications_candidate_id",     "applications", ["candidate_id"])
    op.create_index("ix_applications_status",           "applications", ["status"])
    op.create_index("ix_applications_source_board_id",  "applications", ["source_board_id"])
    op.create_index("ix_applications_source_version_id","applications", ["source_version_id"])
    op.create_index("ix_applications_assigned_to",      "applications", ["assigned_to"])
    op.create_index("ix_applications_deleted_at",       "applications", ["deleted_at"])
    op.create_index("ix_applications_created_at",       "applications", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_applications_created_at",        table_name="applications")
    op.drop_index("ix_applications_deleted_at",        table_name="applications")
    op.drop_index("ix_applications_assigned_to",       table_name="applications")
    op.drop_index("ix_applications_source_version_id", table_name="applications")
    op.drop_index("ix_applications_source_board_id",   table_name="applications")
    op.drop_index("ix_applications_status",            table_name="applications")
    op.drop_index("ix_applications_candidate_id",      table_name="applications")
    op.drop_index("ix_applications_job_id",            table_name="applications")
    op.drop_index("ix_applications_account_id",        table_name="applications")
    op.drop_constraint("uq_applications_job_candidate", "applications", type_="unique")
    op.drop_table("applications")
