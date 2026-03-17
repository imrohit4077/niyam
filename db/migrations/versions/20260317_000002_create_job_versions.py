"""
create_job_versions — A/B testing engine for job descriptions.

WHY: A single job can have multiple copy variants (A, B, C…).
     Recruiters test which description drives more applications.
     Versions are immutable once published — new edits = new version.
     The active version is served to candidates; all versions tracked.

Revision: 20260317_000002
"""

from alembic import op
import sqlalchemy as sa

revision = "20260317_000002"
down_revision = "20260317_000001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "job_versions",
        # ── Identity ──────────────────────────────────────────────
        sa.Column("id", sa.BigInteger, primary_key=True),
        sa.Column(
            "job_id",
            sa.BigInteger,
            sa.ForeignKey("jobs.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "account_id",
            sa.BigInteger,
            sa.ForeignKey("accounts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "created_by",
            sa.BigInteger,
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),

        # ── Version identity ──────────────────────────────────────
        sa.Column("version_name", sa.String(50), nullable=False),   # "A", "B", "Control", "Inclusive"
        sa.Column("version_number", sa.Integer, nullable=False, server_default="1"),

        # ── Content ───────────────────────────────────────────────
        sa.Column("title_override", sa.String(255), nullable=True), # optional title variant
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("requirements", sa.Text, nullable=True),
        sa.Column("benefits", sa.Text, nullable=True),
        sa.Column("call_to_action", sa.String(255), nullable=True), # "Apply Now" vs "Join Us"

        # ── A/B config ────────────────────────────────────────────
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("is_control", sa.Boolean, nullable=False, server_default="false"), # baseline variant
        sa.Column("traffic_weight", sa.Integer, nullable=False, server_default="50"), # 0-100 % of traffic

        # ── Timestamps ───────────────────────────────────────────
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
    )

    # Unique version name per job
    op.create_unique_constraint(
        "uq_job_versions_job_name", "job_versions", ["job_id", "version_name"]
    )

    op.create_index("ix_job_versions_job_id",    "job_versions", ["job_id"])
    op.create_index("ix_job_versions_account_id","job_versions", ["account_id"])
    op.create_index("ix_job_versions_is_active", "job_versions", ["is_active"])


def downgrade() -> None:
    op.drop_index("ix_job_versions_is_active",  table_name="job_versions")
    op.drop_index("ix_job_versions_account_id", table_name="job_versions")
    op.drop_index("ix_job_versions_job_id",     table_name="job_versions")
    op.drop_constraint("uq_job_versions_job_name", "job_versions", type_="unique")
    op.drop_table("job_versions")
