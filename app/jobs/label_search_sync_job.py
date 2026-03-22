"""
Refresh denormalized label_search_document on jobs/applications (async for scale).

API writes label_assignments synchronously; this task recomputes the search blob so
list/search stays fast without joining label tables on every query.
"""
from config.celery import celery_app
from config.database import SessionLocal
from app.services.label_service import LabelService


@celery_app.task(name="forge.sync_label_search_document")
def sync_label_search_document(account_id: int, labelable_type: str, labelable_id: int) -> None:
    db = SessionLocal()
    try:
        LabelService.compute_label_search_document_inline(db, account_id, labelable_type, labelable_id)
    finally:
        db.close()


@celery_app.task(name="forge.reindex_label_search_for_label")
def reindex_label_search_for_label(account_id: int, label_id: int) -> None:
    db = SessionLocal()
    try:
        LabelService.reindex_label_search_documents_for_label(db, account_id, label_id)
    finally:
        db.close()
