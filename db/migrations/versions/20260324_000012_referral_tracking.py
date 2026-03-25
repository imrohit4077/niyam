"""Referral links, bonuses, job/account referral settings, application attribution columns."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = "20260324_000012"
down_revision = "20260321_000011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "referral_links",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("account_id", sa.BigInteger(), nullable=False),
        sa.Column("employee_user_id", sa.BigInteger(), nullable=False),
        sa.Column("job_id", sa.BigInteger(), nullable=False),
        sa.Column("token", sa.String(length=64), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["employee_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["job_id"], ["jobs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token", name="uq_referral_links_token"),
        sa.UniqueConstraint(
            "account_id",
            "employee_user_id",
            "job_id",
            name="uq_referral_links_account_employee_job",
        ),
    )
    op.create_index("ix_referral_links_account_id", "referral_links", ["account_id"])
    op.create_index("ix_referral_links_job_id", "referral_links", ["job_id"])
    op.create_index("ix_referral_links_employee_user_id", "referral_links", ["employee_user_id"])

    op.create_table(
        "referral_bonuses",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("account_id", sa.BigInteger(), nullable=False),
        sa.Column("application_id", sa.BigInteger(), nullable=False),
        sa.Column("referral_link_id", sa.BigInteger(), nullable=True),
        sa.Column("referrer_user_id", sa.BigInteger(), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(length=8), nullable=False, server_default="USD"),
        sa.Column(
            "status",
            sa.String(length=32),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("eligible_after", sa.Date(), nullable=True),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "hris_sync_status",
            sa.String(length=32),
            nullable=False,
            server_default="unsynced",
        ),
        sa.Column("external_payout_id", sa.String(length=255), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["application_id"], ["applications.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["referral_link_id"], ["referral_links.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["referrer_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("application_id", name="uq_referral_bonuses_application_id"),
    )
    op.create_index("ix_referral_bonuses_account_id", "referral_bonuses", ["account_id"])
    op.create_index("ix_referral_bonuses_status", "referral_bonuses", ["status"])
    op.create_index("ix_referral_bonuses_eligible_after", "referral_bonuses", ["eligible_after"])

    op.add_column(
        "applications",
        sa.Column("referral_link_id", sa.BigInteger(), nullable=True),
    )
    op.create_foreign_key(
        "fk_applications_referral_link_id",
        "applications",
        "referral_links",
        ["referral_link_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_applications_referral_link_id", "applications", ["referral_link_id"])
    op.add_column("applications", sa.Column("referral_source", sa.String(length=120), nullable=True))
    op.add_column(
        "applications",
        sa.Column(
            "referral_utm",
            JSONB,
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
    )
    op.add_column(
        "applications",
        sa.Column(
            "referral_risk_flags",
            JSONB,
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )

    op.add_column(
        "jobs",
        sa.Column(
            "referral_settings",
            JSONB,
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
    )


def downgrade() -> None:
    op.drop_column("jobs", "referral_settings")
    op.drop_column("applications", "referral_risk_flags")
    op.drop_column("applications", "referral_utm")
    op.drop_column("applications", "referral_source")
    op.drop_index("ix_applications_referral_link_id", table_name="applications")
    op.drop_constraint("fk_applications_referral_link_id", "applications", type_="foreignkey")
    op.drop_column("applications", "referral_link_id")

    op.drop_index("ix_referral_bonuses_eligible_after", table_name="referral_bonuses")
    op.drop_index("ix_referral_bonuses_status", table_name="referral_bonuses")
    op.drop_index("ix_referral_bonuses_account_id", table_name="referral_bonuses")
    op.drop_table("referral_bonuses")

    op.drop_index("ix_referral_links_employee_user_id", table_name="referral_links")
    op.drop_index("ix_referral_links_job_id", table_name="referral_links")
    op.drop_index("ix_referral_links_account_id", table_name="referral_links")
    op.drop_table("referral_links")
