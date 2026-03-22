"""PostgreSQL search: pg_trgm similarity (`%`) + English full-text (tsvector / tsquery)."""
from __future__ import annotations

from sqlalchemy import Text, bindparam, cast, func, or_
from sqlalchemy.sql import ColumnElement


def normalize_q(raw: str | None, *, max_len: int = 200) -> str | None:
    if raw is None:
        return None
    s = raw.strip()
    if not s:
        return None
    return s[:max_len]


def escape_like_pattern(s: str) -> str:
    return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def ilike_contains(column, q: str, *, param_name: str = "pg_ilike_q") -> ColumnElement[bool]:
    """Substring match with LIKE wildcards escaped (complements trigram for short needles)."""
    pat = bindparam(param_name, value=f"%{escape_like_pattern(q)}%")
    return cast(func.coalesce(column, ""), Text).ilike(pat, escape="\\")


def trigram_match(column, q: str, *, param_name: str = "pg_trgm_q") -> ColumnElement[bool]:
    bp = bindparam(param_name, value=q)
    return cast(func.coalesce(column, ""), Text).op("%")(bp)


def trigram_or(*columns, q: str, param_name: str = "pg_trgm_q") -> ColumnElement[bool]:
    bp = bindparam(param_name, value=q)
    return or_(*[cast(func.coalesce(c, ""), Text).op("%")(bp) for c in columns])


def tsvector_concat(*text_columns) -> ColumnElement:
    parts = [func.to_tsvector("english", cast(func.coalesce(c, ""), Text)) for c in text_columns]
    acc = parts[0]
    for p in parts[1:]:
        acc = acc.op("||")(p)
    return acc


def fts_match_vector(ts_vec: ColumnElement, q: str, *, param_name: str = "pg_fts_q") -> ColumnElement[bool]:
    bp = bindparam(param_name, value=q)
    tsq = func.plainto_tsquery("english", bp)
    return ts_vec.op("@@")(tsq)


def application_search_predicate(
    application_model,
    job_model,
    *,
    q: str,
    trgm_param: str = "app_trgm_q",
    fts_param: str = "app_fts_q",
    tags_ilike_param: str = "app_tags_ilike",
    label_trgm_param: str = "app_label_trgm_q",
) -> ColumnElement[bool]:
    """
    Fuzzy names/emails/URLs, FTS on long text, substring on JSON tags, job title trigram.
    Caller must join job_model when using this (same job_id as application).
    """
    A, J = application_model, job_model
    trgm = trigram_or(
        A.candidate_name,
        A.candidate_email,
        A.candidate_phone,
        A.candidate_location,
        A.linkedin_url,
        A.portfolio_url,
        J.title,
        q=q,
        param_name=trgm_param,
    )
    tags_sub = ilike_contains(A.tags, q, param_name=tags_ilike_param)
    label_trgm = trigram_match(A.label_search_document, q, param_name=label_trgm_param)
    doc_vec = tsvector_concat(A.cover_letter, A.rejection_note)
    fts = fts_match_vector(doc_vec, q, param_name=fts_param)
    return or_(trgm, tags_sub, label_trgm, fts)


def job_search_predicate(job_model, job_version_model, *, q: str, account_id: int) -> ColumnElement[bool]:
    """Trigram on job fields + FTS across version body text; version match via EXISTS."""
    from sqlalchemy import and_, exists, select

    J, JV = job_model, job_version_model
    trgm = trigram_or(
        J.title,
        J.slug,
        J.department,
        J.location,
        J.requisition_id,
        J.cost_center,
        q=q,
        param_name="job_trgm_q",
    )
    ver_fts = fts_match_vector(
        tsvector_concat(JV.description, JV.requirements, JV.benefits),
        q,
        param_name="job_fts_q",
    )
    ver_match = exists(
        select(1)
        .select_from(JV)
        .where(
            and_(
                JV.job_id == J.id,
                JV.account_id == account_id,
                ver_fts,
            )
        )
    )
    label_trgm = trigram_match(J.label_search_document, q, param_name="job_label_trgm_q")
    return or_(trgm, ver_match, label_trgm)
