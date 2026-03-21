"""List e-sign requests for applications (recruiter visibility)."""
from sqlalchemy import and_, or_, select

from app.helpers.pg_search import ilike_contains, normalize_q, trigram_or
from app.models.application import Application
from app.models.esign_request import EsignRequest
from app.models.esign_template import EsignTemplate
from app.models.job import Job
from app.services.base_service import BaseService


class EsignRequestService(BaseService):
    def _enrich_row(self, account_id: int, row: EsignRequest) -> dict:
        d = row.to_dict()
        if row.template_id:
            tpl = EsignTemplate.find_by(self.db, id=row.template_id, account_id=account_id)
            d["template_name"] = tpl.name if tpl else None
        else:
            d["template_name"] = None
        return d

    def list_for_application(self, account_id: int, application_id: int) -> dict:
        app = Application.find_by(self.db, id=application_id, account_id=account_id)
        if not app or app.deleted_at:
            return self.failure("Application not found")
        stmt = (
            select(EsignRequest)
            .where(
                EsignRequest.account_id == account_id,
                EsignRequest.application_id == application_id,
            )
            .order_by(EsignRequest.created_at.desc())
        )
        rows = list(self.db.execute(stmt).scalars().all())
        return self.success([self._enrich_row(account_id, r) for r in rows])

    def list_for_account(
        self,
        account_id: int,
        limit: int = 300,
        q: str | None = None,
        status: str | None = None,
    ) -> dict:
        stmt = select(EsignRequest).where(EsignRequest.account_id == account_id)
        if status:
            stmt = stmt.where(EsignRequest.status == status)
        nq = normalize_q(q)
        if nq:
            stmt = (
                stmt.outerjoin(
                    Application,
                    and_(
                        Application.id == EsignRequest.application_id,
                        Application.account_id == account_id,
                    ),
                )
                .outerjoin(
                    Job,
                    and_(Job.id == Application.job_id, Job.account_id == account_id),
                )
                .outerjoin(
                    EsignTemplate,
                    and_(
                        EsignTemplate.id == EsignRequest.template_id,
                        EsignTemplate.account_id == account_id,
                    ),
                )
                .where(
                    or_(
                        trigram_or(
                            Application.candidate_name,
                            Application.candidate_email,
                            Job.title,
                            EsignTemplate.name,
                            q=nq,
                            param_name="er_trgm",
                        ),
                        ilike_contains(EsignRequest.external_envelope_id, nq, param_name="er_ext"),
                    )
                )
            )
        stmt = stmt.order_by(EsignRequest.created_at.desc()).limit(min(max(limit, 1), 500))
        rows = list(self.db.execute(stmt).scalars().all())
        out: list[dict] = []
        for r in rows:
            d = self._enrich_row(account_id, r)
            app = Application.find_by(self.db, id=r.application_id, account_id=account_id)
            if app and not app.deleted_at:
                d["candidate_name"] = app.candidate_name
                d["candidate_email"] = app.candidate_email
                job = Job.find_by(self.db, id=app.job_id, account_id=account_id)
                d["job_title"] = job.title if job and not job.deleted_at else None
                d["job_id"] = app.job_id
            else:
                d["candidate_name"] = None
                d["candidate_email"] = None
                d["job_title"] = None
                d["job_id"] = None
            out.append(d)
        return self.success(out)
