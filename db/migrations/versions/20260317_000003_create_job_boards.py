"""
create_job_boards — Master registry of distribution platforms.

WHY: This is a global lookup table (not tenant-scoped).
     It defines every platform the system can post to:
     LinkedIn, Indeed, Naukri, Glassdoor, etc.
     Each board has its own integration type and credentials schema.
     Tenant-level credentials are stored in job_board_credentials (future).

Revision: 20260317_000003
"""

from alembic import op
import sqlalchemy as sa

revision = "20260317_000003"
down_revision = "20260317_000002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "job_boards",
        # ── Identity ──────────────────────────────────────────────
        sa.Column("id", sa.BigInteger, primary_key=True),

        # ── Board identity ────────────────────────────────────────
        sa.Column("name", sa.String(100), nullable=False, unique=True),  # "LinkedIn", "Indeed"
        sa.Column("slug", sa.String(100), nullable=False, unique=True),  # "linkedin", "indeed"
        sa.Column("logo_url", sa.String(512), nullable=True),
        sa.Column("website_url", sa.String(512), nullable=True),

        # ── Integration ───────────────────────────────────────────
        sa.Column("integration_type", sa.String(50), nullable=False,
                  server_default="manual"),                              # api | xml_feed | manual | webhook
        sa.Column("api_endpoint", sa.String(512), nullable=True),
        sa.Column("api_version", sa.String(20), nullable=True),
        sa.Column("auth_type", sa.String(50), nullable=True),           # oauth2 | api_key | basic
        sa.Column("supports_apply_redirect", sa.Boolean,
                  nullable=False, server_default="true"),
        sa.Column("supports_direct_apply", sa.Boolean,
                  nullable=False, server_default="false"),

        # ── Capabilities ─────────────────────────────────────────
        sa.Column("supported_countries", sa.JSON, nullable=False,
                  server_default=sa.text("'[]'")),                       # ["US", "IN", "GB"]
        sa.Column("supported_job_types", sa.JSON, nullable=False,
                  server_default=sa.text("'[]'")),                       # ["full_time", "contract"]
        sa.Column("required_fields", sa.JSON, nullable=False,
                  server_default=sa.text("'[]'")),                       # fields board mandates

        # ── Status ────────────────────────────────────────────────
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("is_premium", sa.Boolean, nullable=False, server_default="false"),

        # ── Timestamps ───────────────────────────────────────────
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
    )

    op.create_index("ix_job_boards_slug",      "job_boards", ["slug"])
    op.create_index("ix_job_boards_is_active", "job_boards", ["is_active"])


def downgrade() -> None:
    op.drop_index("ix_job_boards_is_active", table_name="job_boards")
    op.drop_index("ix_job_boards_slug",      table_name="job_boards")
    op.drop_table("job_boards")
