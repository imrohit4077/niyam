"""Interviewer dashboard, kit payload, scorecard submit, assignment updates."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import and_, or_, select

from app.helpers.pg_search import normalize_q, trigram_or
from app.models.application import Application
from app.models.interview_assignment import InterviewAssignment
from app.models.interview_kit import InterviewKit
from app.models.interview_plan import InterviewPlan
from app.models.interview_scorecard import InterviewScorecard
from app.models.job import Job
from app.services.base_service import BaseService
from app.helpers.scorecard_criteria import normalize_job_criteria, validate_criteria_scores

_RECOMMENDATIONS = frozenset({"yes", "strong_yes", "strong_no", "no", "maybe"})


def _parse_dt(value: datetime | str | None) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    s = str(value).strip()
    if not s:
        return None
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    return datetime.fromisoformat(s)


class InterviewWorkflowService(BaseService):
    def list_my_assignments(
        self,
        account_id: int,
        user_id: int,
        status: str | None = None,
        q: str | None = None,
    ) -> dict:
        nq = normalize_q(q)
        if nq:
            stmt = (
                select(InterviewAssignment)
                .join(Application, Application.id == InterviewAssignment.application_id)
                .join(Job, Job.id == Application.job_id)
                .outerjoin(
                    InterviewPlan,
                    and_(
                        InterviewPlan.id == InterviewAssignment.interview_plan_id,
                        InterviewPlan.account_id == account_id,
                    ),
                )
                .where(
                    InterviewAssignment.account_id == account_id,
                    InterviewAssignment.interviewer_id == user_id,
                    Application.account_id == account_id,
                    Application.deleted_at == None,
                    Job.account_id == account_id,
                    Job.deleted_at == None,
                    or_(
                        trigram_or(
                            Application.candidate_name,
                            Application.candidate_email,
                            Job.title,
                            InterviewPlan.name,
                            q=nq,
                            param_name="iv_trgm",
                        ),
                    ),
                )
                .order_by(
                    InterviewAssignment.scheduled_at.asc().nulls_last(),
                    InterviewAssignment.id.asc(),
                )
            )
        else:
            stmt = (
                select(InterviewAssignment)
                .where(
                    InterviewAssignment.account_id == account_id,
                    InterviewAssignment.interviewer_id == user_id,
                )
                .order_by(
                    InterviewAssignment.scheduled_at.asc().nulls_last(),
                    InterviewAssignment.id.asc(),
                )
            )
        if status:
            stmt = stmt.where(InterviewAssignment.status == status)
        rows = list(self.db.execute(stmt).scalars().all())
        out = []
        for a in rows:
            d = a.to_dict()
            plan = InterviewPlan.find_by(self.db, id=a.interview_plan_id, account_id=account_id)
            d["interview_plan"] = plan.to_dict() if plan else None
            app = Application.find_by(self.db, id=a.application_id, account_id=account_id)
            if app:
                d["application"] = {
                    "id": app.id,
                    "candidate_id": app.candidate_id,
                    "candidate_name": app.candidate_name,
                    "candidate_email": app.candidate_email,
                    "job_id": app.job_id,
                }
            else:
                d["application"] = None
            out.append(d)
        return self.success(out)

    def get_kit_for_assignment(self, account_id: int, assignment_id: int) -> dict:
        ass = InterviewAssignment.find_by(self.db, id=assignment_id, account_id=account_id)
        if not ass:
            return self.failure("Assignment not found")
        app = Application.find_by(self.db, id=ass.application_id, account_id=account_id)
        if not app:
            return self.failure("Application not found")
        job = Job.find_by(self.db, id=app.job_id, account_id=account_id)
        plan = InterviewPlan.find_by(self.db, id=ass.interview_plan_id, account_id=account_id)
        if not plan:
            return self.failure("Interview plan not found")
        kit = InterviewKit.find_by(self.db, interview_plan_id=plan.id)

        candidate = {
            "name": app.candidate_name,
            "email": app.candidate_email,
            "phone": app.candidate_phone,
            "location": app.candidate_location,
            "resume_url": app.resume_url,
            "linkedin_url": app.linkedin_url,
            "portfolio_url": app.portfolio_url,
        }

        crit = normalize_job_criteria(job.scorecard_criteria if job else [])

        return self.success(
            {
                "assignment": ass.to_dict(),
                "interview_plan": plan.to_dict(),
                "kit": kit.to_dict() if kit else None,
                "candidate": candidate,
                "job": job.to_dict() if job else None,
                "application": app.to_dict(),
                "scorecard_criteria": crit,
            }
        )

    def submit_scorecard(
        self,
        account_id: int,
        assignment_id: int,
        interviewer_id: int,
        data: dict,
    ) -> dict:
        ass = InterviewAssignment.find_by(self.db, id=assignment_id, account_id=account_id)
        if not ass:
            return self.failure("Assignment not found")
        if ass.interviewer_id is not None and ass.interviewer_id != interviewer_id:
            return self.failure("You are not the assigned interviewer for this slot")

        rec = (data.get("overall_recommendation") or "").strip().lower().replace(" ", "_")
        if rec == "strongno":
            rec = "strong_no"
        if rec not in _RECOMMENDATIONS:
            return self.failure(
                f"overall_recommendation must be one of: {', '.join(sorted(_RECOMMENDATIONS))}"
            )

        app = Application.find_by(self.db, id=ass.application_id, account_id=account_id)
        if not app:
            return self.failure("Application not found")
        job = Job.find_by(self.db, id=app.job_id, account_id=account_id)
        if not job:
            return self.failure("Job not found")

        raw_scores = data.get("criteria_scores")
        if raw_scores is None and data.get("scores") is not None:
            raw_scores = data.get("scores")
        if raw_scores is not None and not isinstance(raw_scores, dict):
            return self.failure("criteria_scores (or scores) must be an object")
        scores_dict: dict = raw_scores if isinstance(raw_scores, dict) else {}

        template = normalize_job_criteria(job.scorecard_criteria)
        err = validate_criteria_scores(template, scores_dict)
        if err:
            return self.failure(err)

        existing = InterviewScorecard.find_by(
            self.db, assignment_id=assignment_id, interviewer_id=interviewer_id
        )
        if existing:
            return self.failure("Scorecard already submitted for this assignment")

        now = datetime.now(timezone.utc)
        sc = InterviewScorecard(
            account_id=account_id,
            assignment_id=assignment_id,
            application_id=app.id,
            job_id=job.id,
            interviewer_id=interviewer_id,
            overall_recommendation=rec,
            criteria_scores=scores_dict,
            notes=data.get("notes"),
            pros=data.get("pros"),
            cons=data.get("cons"),
            internal_notes=data.get("internal_notes"),
            submitted_at=now,
            created_at=now,
            updated_at=now,
        )
        sc.save(self.db)

        if ass.interviewer_id is None:
            ass.interviewer_id = interviewer_id
        ass.status = "completed"
        ass.updated_at = now
        ass.save(self.db)
        return self.success(sc.to_dict())

    def update_assignment(self, account_id: int, assignment_id: int, data: dict) -> dict:
        ass = InterviewAssignment.find_by(self.db, id=assignment_id, account_id=account_id)
        if not ass:
            return self.failure("Assignment not found")
        now = datetime.now(timezone.utc)
        if "interviewer_id" in data:
            ass.interviewer_id = data.get("interviewer_id")
        if "status" in data and data["status"]:
            ass.status = str(data["status"])
        if "scheduled_at" in data:
            ass.scheduled_at = _parse_dt(data.get("scheduled_at"))
        if "interview_ends_at" in data:
            ass.interview_ends_at = _parse_dt(data.get("interview_ends_at"))
            ass.scorecard_reminder_sent_at = None
        if "calendar_event_url" in data:
            ass.calendar_event_url = data.get("calendar_event_url")
        if ass.scheduled_at and ass.interview_ends_at and ass.interview_ends_at < ass.scheduled_at:
            return self.failure("interview_ends_at must be on or after scheduled_at")
        ass.updated_at = now
        ass.save(self.db)
        return self.success(ass.to_dict())
