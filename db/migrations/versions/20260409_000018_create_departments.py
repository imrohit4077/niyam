"""Departments table (account-scoped); migrate from accounts.settings.organization.departments JSON."""

import json

import sqlalchemy as sa
from alembic import op
from sqlalchemy import text

revision = "20260409_000018"
down_revision = "20260409_000017"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "departments",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("account_id", sa.BigInteger(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("account_id", "name", name="uq_departments_account_name"),
    )
    op.create_index("ix_departments_account_id", "departments", ["account_id"])

    conn = op.get_bind()
    rows = conn.execute(text("SELECT id, settings FROM accounts")).fetchall()
    for acc_id, settings in rows:
        if settings is None:
            continue
        if isinstance(settings, str):
            try:
                settings = json.loads(settings)
            except json.JSONDecodeError:
                continue
        if not isinstance(settings, dict):
            continue
        org = settings.get("organization")
        if not isinstance(org, dict):
            continue
        raw_depts = org.get("departments")
        if not isinstance(raw_depts, list):
            raw_depts = []
        seen: set[str] = set()
        for item in raw_depts:
            name: str | None = None
            if isinstance(item, dict):
                name = str(item.get("name") or "").strip()
            elif isinstance(item, str):
                name = item.strip()
            if not name:
                continue
            key = name.casefold()
            if key in seen:
                continue
            seen.add(key)
            conn.execute(
                text(
                    "INSERT INTO departments (account_id, name, created_at, updated_at) "
                    "VALUES (:aid, :name, now(), now())"
                ),
                {"aid": acc_id, "name": name[:255]},
            )
        if "departments" in org:
            del org["departments"]
            settings["organization"] = org
            conn.execute(
                text("UPDATE accounts SET settings = CAST(:js AS jsonb), updated_at = now() WHERE id = :id"),
                {"js": json.dumps(settings), "id": acc_id},
            )


def downgrade() -> None:
    op.drop_index("ix_departments_account_id", table_name="departments")
    op.drop_table("departments")
