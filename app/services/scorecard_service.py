"""Read-side scorecard APIs: per-application history and job debrief aggregates."""
from __future__ import annotations

from collections import defaultdict
from sqlalchemy import select

from app.models.interview_scorecard import InterviewScorecard
from app.models.user import User
from app.models.application import Application
from app.models.job import Job
from app.helpers.scorecard_criteria import (
    average_numeric_scores,
    normalize_job_criteria,
    scan_bias_proxies,
)
from app.services.base_service import BaseService


class ScorecardService(BaseService):
    def list_for_application(self, account_id: int, application_id: int) -> dict:
        app = Application.find_by(self.db, id=application_id, account_id=account_id)
        if not app:
            return self.failure("Application not found")
        stmt = (
            select(InterviewScorecard)
            .where(
                InterviewScorecard.account_id == account_id,
                InterviewScorecard.application_id == application_id,
            )
            .order_by(InterviewScorecard.submitted_at.desc().nulls_last(), InterviewScorecard.id.desc())
        )
        rows = list(self.db.execute(stmt).scalars().all())
        out = []
        for sc in rows:
            d = sc.to_dict()
            u = User.find_by(self.db, id=sc.interviewer_id)
            d["interviewer"] = (
                {"id": u.id, "name": u.name, "email": u.email} if u else {"id": sc.interviewer_id}
            )
            d["bias_flags"] = scan_bias_proxies(sc.internal_notes) + scan_bias_proxies(sc.notes)
            d["bias_flags"] = list(dict.fromkeys(d["bias_flags"]))
            d["criteria_average"] = average_numeric_scores(sc.criteria_scores or {})
            out.append(d)
        return self.success(out)

    def debrief_for_job(self, account_id: int, job_id: int) -> dict:
        job = Job.find_by(self.db, id=job_id, account_id=account_id)
        if not job or job.deleted_at:
            return self.failure("Job not found")
        stmt = select(InterviewScorecard).where(
            InterviewScorecard.account_id == account_id,
            InterviewScorecard.job_id == job_id,
        )
        rows = list(self.db.execute(stmt).scalars().all())
        template = normalize_job_criteria(job.scorecard_criteria)
        attr_names = [c["name"] for c in template] if template else []

        by_app: dict[int, list[InterviewScorecard]] = defaultdict(list)
        for sc in rows:
            by_app[sc.application_id].append(sc)

        applications_out = []
        for app_id, scards in by_app.items():
            app = Application.find_by(self.db, id=app_id, account_id=account_id)
            label = "—"
            if app:
                label = app.candidate_name or app.candidate_email or f"Application #{app_id}"

            rec_counts: dict[str, int] = defaultdict(int)
            attr_sums: dict[str, list[float]] = defaultdict(list)
            interviewer_rows = []

            for sc in scards:
                rec_counts[sc.overall_recommendation] += 1
                interviewer_rows.append(
                    {
                        "assignment_id": sc.assignment_id,
                        "interviewer_id": sc.interviewer_id,
                        "overall_recommendation": sc.overall_recommendation,
                        "submitted_at": sc.submitted_at.isoformat() if sc.submitted_at else None,
                        "criteria_average": average_numeric_scores(sc.criteria_scores or {}),
                    }
                )
                for k, v in (sc.criteria_scores or {}).items():
                    try:
                        attr_sums[k].append(float(v))
                    except (TypeError, ValueError):
                        pass

            attr_avgs = {
                k: round(sum(v) / len(v), 2) for k, v in attr_sums.items() if v
            }
            fit_scores = [x["criteria_average"] for x in interviewer_rows if x["criteria_average"] is not None]
            fit_score = round(sum(fit_scores) / len(fit_scores), 2) if fit_scores else None

            applications_out.append(
                {
                    "application_id": app_id,
                    "candidate_label": label,
                    "scorecard_count": len(scards),
                    "recommendation_counts": dict(rec_counts),
                    "attribute_averages": attr_avgs,
                    "fit_score": fit_score,
                    "interviewers": interviewer_rows,
                }
            )

        applications_out.sort(key=lambda x: (-(x["fit_score"] or 0), x["candidate_label"]))

        return self.success(
            {
                "job_id": job_id,
                "template_attributes": attr_names,
                "applications": applications_out,
            }
        )
