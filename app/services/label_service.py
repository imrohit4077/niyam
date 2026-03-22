"""Account labels CRUD + assignments on jobs and applications (scalable, search via denormalized document)."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.helpers.logger import get_logger
from app.models.account_label import AccountLabel
from app.models.application import Application
from app.models.job import Job
from app.models.label_assignment import LabelAssignment
from app.services.base_service import BaseService

logger = get_logger(__name__)

LABELABLE_JOB = "job"
LABELABLE_APPLICATION = "application"
_VALID_LABELABLE = frozenset({LABELABLE_JOB, LABELABLE_APPLICATION})


def _enqueue_sync_label_search_safe(db: Session, account_id: int, labelable_type: str, labelable_id: int) -> None:
    try:
        from app.jobs.label_search_sync_job import sync_label_search_document

        sync_label_search_document.delay(
            account_id=account_id,
            labelable_type=labelable_type,
            labelable_id=labelable_id,
        )
    except Exception:
        logger.warning(
            "Could not enqueue label search sync; running inline",
            exc_info=True,
            extra={"account_id": account_id, "labelable_type": labelable_type, "labelable_id": labelable_id},
        )
        try:
            LabelService.compute_label_search_document_inline(db, account_id, labelable_type, labelable_id)
        except Exception:
            logger.exception("Inline label search sync failed")


def _enqueue_reindex_label(db: Session, account_id: int, label_id: int) -> None:
    try:
        from app.jobs.label_search_sync_job import reindex_label_search_for_label

        reindex_label_search_for_label.delay(account_id=account_id, label_id=label_id)
    except Exception:
        logger.warning(
            "Could not enqueue label reindex job; running inline",
            exc_info=True,
            extra={"account_id": account_id, "label_id": label_id},
        )
        try:
            LabelService.reindex_label_search_documents_for_label(db, account_id, label_id)
        except Exception:
            logger.exception("Inline label reindex failed", extra={"label_id": label_id})


class LabelService(BaseService):
    @staticmethod
    def reindex_label_search_documents_for_label(db: Session, account_id: int, label_id: int) -> None:
        stmt = (
            select(LabelAssignment.labelable_type, LabelAssignment.labelable_id)
            .where(
                LabelAssignment.account_id == account_id,
                LabelAssignment.label_id == label_id,
            )
            .distinct()
        )
        pairs = list(db.execute(stmt))
        for lt, lid in pairs:
            LabelService.compute_label_search_document_inline(db, account_id, lt, lid)

    @staticmethod
    def compute_label_search_document_inline(
        db: Session,
        account_id: int,
        labelable_type: str,
        labelable_id: int,
    ) -> None:
        stmt = (
            select(AccountLabel.title)
            .join(LabelAssignment, LabelAssignment.label_id == AccountLabel.id)
            .where(
                LabelAssignment.account_id == account_id,
                LabelAssignment.labelable_type == labelable_type,
                LabelAssignment.labelable_id == labelable_id,
            )
            .order_by(AccountLabel.title.asc())
        )
        titles = [row[0] for row in db.execute(stmt)]
        doc = " ".join(titles).strip()
        if labelable_type == LABELABLE_JOB:
            job = Job.find_by(db, id=labelable_id, account_id=account_id)
            if job and not job.deleted_at:
                job.label_search_document = doc
                job.updated_at = datetime.now(timezone.utc)
                db.add(job)
                db.commit()
                db.refresh(job)
        elif labelable_type == LABELABLE_APPLICATION:
            app = Application.find_by(db, id=labelable_id, account_id=account_id)
            if app and not app.deleted_at:
                app.label_search_document = doc
                app.updated_at = datetime.now(timezone.utc)
                db.add(app)
                db.commit()
                db.refresh(app)

    def list_labels(self, account_id: int) -> dict:
        stmt = (
            select(AccountLabel)
            .where(AccountLabel.account_id == account_id)
            .order_by(AccountLabel.title.asc())
        )
        rows = list(self.db.execute(stmt).scalars().all())
        return self.success([r.to_dict() for r in rows])

    def create_label(self, account_id: int, data: dict) -> dict:
        title = (data.get("title") or "").strip()
        if not title:
            return self.failure("title is required")
        if len(title) > 160:
            return self.failure("title must be at most 160 characters")
        existing = self.db.execute(
            select(AccountLabel).where(
                AccountLabel.account_id == account_id,
                AccountLabel.title == title,
            )
        ).scalar_one_or_none()
        if existing:
            return self.failure("A label with this title already exists")
        now = datetime.now(timezone.utc)
        row = AccountLabel(
            account_id=account_id,
            title=title,
            description=(data.get("description") or "").strip() or None,
            color=(data.get("color") or "").strip() or None,
            created_at=now,
            updated_at=now,
        )
        row.save(self.db)
        return self.success(row.to_dict())

    def update_label(self, account_id: int, label_id: int, data: dict) -> dict:
        row = AccountLabel.find_by(self.db, id=label_id, account_id=account_id)
        if not row:
            return self.failure("Label not found")
        title_changed = False
        if "title" in data:
            title = (data.get("title") or "").strip()
            if not title:
                return self.failure("title cannot be empty")
            if len(title) > 160:
                return self.failure("title must be at most 160 characters")
            dup = self.db.execute(
                select(AccountLabel).where(
                    AccountLabel.account_id == account_id,
                    AccountLabel.title == title,
                    AccountLabel.id != label_id,
                )
            ).scalar_one_or_none()
            if dup:
                return self.failure("A label with this title already exists")
            if row.title != title:
                title_changed = True
            row.title = title
        if "description" in data:
            d = data.get("description")
            row.description = None if d is None else (str(d).strip() or None)
        if "color" in data:
            c = data.get("color")
            row.color = None if c is None else (str(c).strip() or None)
        row.updated_at = datetime.now(timezone.utc)
        row.save(self.db)
        if title_changed:
            _enqueue_reindex_label(self.db, account_id, label_id)
        return self.success(row.to_dict())

    def delete_label(self, account_id: int, label_id: int) -> dict:
        row = AccountLabel.find_by(self.db, id=label_id, account_id=account_id)
        if not row:
            return self.failure("Label not found")
        pairs_stmt = select(LabelAssignment.labelable_type, LabelAssignment.labelable_id).where(
            LabelAssignment.account_id == account_id,
            LabelAssignment.label_id == label_id,
        )
        pairs = list(self.db.execute(pairs_stmt))
        row.destroy(self.db)
        for lt, lid in pairs:
            _enqueue_sync_label_search_safe(self.db, account_id, lt, lid)
        return self.success({"deleted": True})

    def set_entity_labels(
        self,
        account_id: int,
        labelable_type: str,
        labelable_id: int,
        label_ids: list[int],
    ) -> dict:
        if labelable_type not in _VALID_LABELABLE:
            return self.failure("Invalid labelable_type")
        if labelable_type == LABELABLE_JOB:
            ent = Job.find_by(self.db, id=labelable_id, account_id=account_id)
            if not ent or ent.deleted_at:
                return self.failure("Job not found")
        else:
            ent = Application.find_by(self.db, id=labelable_id, account_id=account_id)
            if not ent or ent.deleted_at:
                return self.failure("Application not found")

        uniq = sorted({int(x) for x in label_ids})
        if uniq:
            stmt = select(AccountLabel.id).where(
                AccountLabel.account_id == account_id,
                AccountLabel.id.in_(uniq),
            )
            found = {r[0] for r in self.db.execute(stmt)}
            if found != set(uniq):
                return self.failure("One or more labels are invalid for this workspace")

        self.db.execute(
            delete(LabelAssignment).where(
                LabelAssignment.account_id == account_id,
                LabelAssignment.labelable_type == labelable_type,
                LabelAssignment.labelable_id == labelable_id,
            )
        )
        now = datetime.now(timezone.utc)
        for lid in uniq:
            self.db.add(
                LabelAssignment(
                    account_id=account_id,
                    label_id=lid,
                    labelable_type=labelable_type,
                    labelable_id=labelable_id,
                    created_at=now,
                )
            )
        self.db.commit()
        _enqueue_sync_label_search_safe(self.db, account_id, labelable_type, labelable_id)
        payload = self.labels_payload_for_entity(account_id, labelable_type, labelable_id)
        return self.success({"labels": payload})

    def labels_payload_for_entity(self, account_id: int, labelable_type: str, labelable_id: int) -> list[dict]:
        stmt = (
            select(AccountLabel)
            .join(LabelAssignment, LabelAssignment.label_id == AccountLabel.id)
            .where(
                LabelAssignment.account_id == account_id,
                LabelAssignment.labelable_type == labelable_type,
                LabelAssignment.labelable_id == labelable_id,
            )
            .order_by(AccountLabel.title.asc())
        )
        rows = list(self.db.execute(stmt).scalars().all())
        return [r.to_dict() for r in rows]

    @classmethod
    def labels_map_for_entities(
        cls,
        db: Session,
        account_id: int,
        labelable_type: str,
        entity_ids: list[int],
    ) -> dict[int, list[dict]]:
        if not entity_ids:
            return {}
        stmt = (
            select(LabelAssignment.labelable_id, AccountLabel)
            .join(AccountLabel, AccountLabel.id == LabelAssignment.label_id)
            .where(
                LabelAssignment.account_id == account_id,
                LabelAssignment.labelable_type == labelable_type,
                LabelAssignment.labelable_id.in_(entity_ids),
            )
            .order_by(LabelAssignment.labelable_id.asc(), AccountLabel.title.asc())
        )
        out: dict[int, list[dict]] = {eid: [] for eid in entity_ids}
        for eid, lbl in db.execute(stmt):
            out.setdefault(int(eid), []).append(lbl.to_dict())
        return out
