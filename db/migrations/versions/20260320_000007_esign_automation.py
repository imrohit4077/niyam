"""E-sign templates, stage automation rules, and signing request audit trail."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = "20260320_000007"
down_revision = "20260320_000006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "esign_templates",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), primary_key=True),
        sa.Column(
            "account_id",
            sa.BigInteger(),
            sa.ForeignKey("accounts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.String(512), nullable=True),
        sa.Column("content_html", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_esign_templates_account_id", "esign_templates", ["account_id"])

    op.create_table(
        "esign_stage_rules",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), primary_key=True),
        sa.Column(
            "account_id",
            sa.BigInteger(),
            sa.ForeignKey("accounts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "job_id",
            sa.BigInteger(),
            sa.ForeignKey("jobs.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column(
            "pipeline_stage_id",
            sa.BigInteger(),
            sa.ForeignKey("pipeline_stages.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("trigger_stage_type", sa.String(50), nullable=True),
        sa.Column("action_type", sa.String(50), nullable=False, server_default="send_esign"),
        sa.Column(
            "template_id",
            sa.BigInteger(),
            sa.ForeignKey("esign_templates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_esign_stage_rules_account_job", "esign_stage_rules", ["account_id", "job_id"])
    op.create_index(
        "ix_esign_stage_rules_account_stage_type",
        "esign_stage_rules",
        ["account_id", "trigger_stage_type"],
    )
    op.execute(
        """
        ALTER TABLE esign_stage_rules ADD CONSTRAINT ck_esign_stage_rules_scope CHECK (
            (job_id IS NOT NULL AND pipeline_stage_id IS NOT NULL AND trigger_stage_type IS NULL)
            OR
            (job_id IS NULL AND pipeline_stage_id IS NULL AND trigger_stage_type IS NOT NULL)
        )
        """
    )

    op.create_table(
        "esign_requests",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), primary_key=True),
        sa.Column(
            "account_id",
            sa.BigInteger(),
            sa.ForeignKey("accounts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "application_id",
            sa.BigInteger(),
            sa.ForeignKey("applications.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "template_id",
            sa.BigInteger(),
            sa.ForeignKey("esign_templates.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "rule_id",
            sa.BigInteger(),
            sa.ForeignKey("esign_stage_rules.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("provider", sa.String(50), nullable=False, server_default="internal"),
        sa.Column("external_envelope_id", sa.String(255), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="queued"),
        sa.Column("rendered_html", sa.Text(), nullable=True),
        sa.Column("candidate_sign_token", sa.String(64), nullable=False),
        sa.Column("signing_url", sa.String(1024), nullable=True),
        sa.Column("signed_document_url", sa.String(1024), nullable=True),
        sa.Column("signer_legal_name", sa.String(255), nullable=True),
        sa.Column("provider_metadata", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("events", JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("viewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("signed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("declined_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_esign_requests_account_app", "esign_requests", ["account_id", "application_id"])
    op.create_index(
        "uq_esign_requests_candidate_sign_token",
        "esign_requests",
        ["candidate_sign_token"],
        unique=True,
    )
    op.create_index(
        "ix_esign_requests_external_envelope",
        "esign_requests",
        ["external_envelope_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_esign_requests_external_envelope", table_name="esign_requests")
    op.drop_index("uq_esign_requests_candidate_sign_token", table_name="esign_requests")
    op.drop_index("ix_esign_requests_account_app", table_name="esign_requests")
    op.drop_table("esign_requests")
    op.execute("ALTER TABLE esign_stage_rules DROP CONSTRAINT IF EXISTS ck_esign_stage_rules_scope")
    op.drop_index("ix_esign_stage_rules_account_stage_type", table_name="esign_stage_rules")
    op.drop_index("ix_esign_stage_rules_account_job", table_name="esign_stage_rules")
    op.drop_table("esign_stage_rules")
    op.drop_index("ix_esign_templates_account_id", table_name="esign_templates")
    op.drop_table("esign_templates")
