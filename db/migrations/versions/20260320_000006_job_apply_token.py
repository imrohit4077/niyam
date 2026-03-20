"""Unique apply_token per job for public candidate application links."""

import secrets

import sqlalchemy as sa
from alembic import op

revision = "20260320_000006"
down_revision = "20260320_000005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("jobs", sa.Column("apply_token", sa.String(64), nullable=True))
    conn = op.get_bind()
    rows = conn.execute(sa.text("SELECT id FROM jobs")).fetchall()
    for (jid,) in rows:
        tok = secrets.token_urlsafe(32)
        conn.execute(
            sa.text("UPDATE jobs SET apply_token = :t WHERE id = :id"),
            {"t": tok, "id": jid},
        )
    op.alter_column("jobs", "apply_token", nullable=False)
    op.create_index("uq_jobs_apply_token", "jobs", ["apply_token"], unique=True)


def downgrade() -> None:
    op.drop_index("uq_jobs_apply_token", table_name="jobs")
    op.drop_column("jobs", "apply_token")
