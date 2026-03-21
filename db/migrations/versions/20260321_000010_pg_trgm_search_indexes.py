"""Enable pg_trgm and add GIN indexes for list search (jobs, applications, boards, etc.)."""

import sqlalchemy as sa
from alembic import op

revision = "20260321_000010"
down_revision = "20260321_000009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(sa.text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
    # Expression indexes — used by ILIKE/% and FTS planning; safe if extension exists.
    op.execute(
        sa.text(
            "CREATE INDEX IF NOT EXISTS ix_jobs_title_trgm ON jobs USING gin (title gin_trgm_ops)"
        )
    )
    op.execute(
        sa.text(
            "CREATE INDEX IF NOT EXISTS ix_jobs_department_trgm ON jobs USING gin (department gin_trgm_ops)"
        )
    )
    op.execute(
        sa.text(
            "CREATE INDEX IF NOT EXISTS ix_applications_candidate_email_trgm "
            "ON applications USING gin (candidate_email gin_trgm_ops)"
        )
    )
    op.execute(
        sa.text(
            "CREATE INDEX IF NOT EXISTS ix_applications_candidate_name_trgm "
            "ON applications USING gin (candidate_name gin_trgm_ops)"
        )
    )
    op.execute(
        sa.text(
            "CREATE INDEX IF NOT EXISTS ix_job_boards_name_trgm ON job_boards USING gin (name gin_trgm_ops)"
        )
    )
    op.execute(
        sa.text(
            "CREATE INDEX IF NOT EXISTS ix_users_name_trgm ON users USING gin (name gin_trgm_ops)"
        )
    )
    op.execute(
        sa.text(
            "CREATE INDEX IF NOT EXISTS ix_users_email_trgm ON users USING gin (email gin_trgm_ops)"
        )
    )
    op.execute(
        sa.text(
            "CREATE INDEX IF NOT EXISTS ix_job_versions_description_fts "
            "ON job_versions USING gin (to_tsvector('english', coalesce(description, '')))"
        )
    )
    op.execute(
        sa.text(
            "CREATE INDEX IF NOT EXISTS ix_applications_cover_letter_fts "
            "ON applications USING gin (to_tsvector('english', coalesce(cover_letter, '')))"
        )
    )


def downgrade() -> None:
    op.execute(sa.text("DROP INDEX IF EXISTS ix_applications_cover_letter_fts"))
    op.execute(sa.text("DROP INDEX IF EXISTS ix_job_versions_description_fts"))
    op.execute(sa.text("DROP INDEX IF EXISTS ix_users_email_trgm"))
    op.execute(sa.text("DROP INDEX IF EXISTS ix_users_name_trgm"))
    op.execute(sa.text("DROP INDEX IF EXISTS ix_job_boards_name_trgm"))
    op.execute(sa.text("DROP INDEX IF EXISTS ix_applications_candidate_name_trgm"))
    op.execute(sa.text("DROP INDEX IF EXISTS ix_applications_candidate_email_trgm"))
    op.execute(sa.text("DROP INDEX IF EXISTS ix_jobs_department_trgm"))
    op.execute(sa.text("DROP INDEX IF EXISTS ix_jobs_title_trgm"))
    op.execute(sa.text("DROP EXTENSION IF EXISTS pg_trgm"))
