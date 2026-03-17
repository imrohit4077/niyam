"""
create_jobs — Core job entity (tenant-scoped).

WHY: Every ATS starts here. One row = one open position.
     Tenant-isolated via account_id. Soft-deletable via deleted_at.
     SEO metadata + video embed stored as JSONB for flexibility.

Revision: 20260317_000001
"""

from alembic import op
import sqlalchemy as sa

revision = "20260317_000001"
down_revision = "20260315_152125"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "jobs",
        # ── Identity ──────────────────────────────────────────────
        sa.Column("id", sa.BigInteger, primary_key=True),
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

        # ── Core fields ───────────────────────────────────────────
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(255), nullable=False),          # URL-friendly, unique per account
        sa.Column("department", sa.String(100), nullable=True),
        sa.Column("location", sa.String(255), nullable=True),
        sa.Column("location_type", sa.String(50), nullable=True,    # remote | onsite | hybrid
                  server_default="onsite"),
        sa.Column("employment_type", sa.String(50), nullable=True,  # full_time | part_time | contract | internship
                  server_default="full_time"),
        sa.Column("experience_level", sa.String(50), nullable=True),# junior | mid | senior | lead
        sa.Column("salary_min", sa.Numeric(12, 2), nullable=True),
        sa.Column("salary_max", sa.Numeric(12, 2), nullable=True),
        sa.Column("salary_currency", sa.String(10), nullable=True, server_default="USD"),
        sa.Column("salary_visible", sa.Boolean, nullable=False, server_default="true"),

        # ── Status & lifecycle ────────────────────────────────────
        sa.Column("status", sa.String(50), nullable=False,
                  server_default="draft"),                          # draft | open | paused | closed | archived
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("closes_at", sa.DateTime(timezone=True), nullable=True),

        # ── Rich content ──────────────────────────────────────────
        sa.Column("video_embed_url", sa.String(512), nullable=True),
        sa.Column("seo_metadata", sa.JSON, nullable=False,
                  server_default=sa.text("'{}'")),                  # {title, description, keywords}
        sa.Column("custom_fields", sa.JSON, nullable=False,
                  server_default=sa.text("'{}'")),                  # tenant-defined extra fields
        sa.Column("tags", sa.JSON, nullable=False,
                  server_default=sa.text("'[]'")),                  # ["python", "remote-ok"]

        # ── Soft delete ───────────────────────────────────────────
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),

        # ── Timestamps ───────────────────────────────────────────
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
    )

    # Unique slug per account
    op.create_unique_constraint("uq_jobs_account_slug", "jobs", ["account_id", "slug"])

    # Query indexes
    op.create_index("ix_jobs_account_id",  "jobs", ["account_id"])
    op.create_index("ix_jobs_status",      "jobs", ["status"])
    op.create_index("ix_jobs_created_by",  "jobs", ["created_by"])
    op.create_index("ix_jobs_deleted_at",  "jobs", ["deleted_at"])


def downgrade() -> None:
    op.drop_index("ix_jobs_deleted_at",  table_name="jobs")
    op.drop_index("ix_jobs_created_by",  table_name="jobs")
    op.drop_index("ix_jobs_status",      table_name="jobs")
    op.drop_index("ix_jobs_account_id",  table_name="jobs")
    op.drop_constraint("uq_jobs_account_slug", "jobs", type_="unique")
    op.drop_table("jobs")
