"""
Database seeding. Rails equivalent: db/seeds.rb
Creates: 1 account, 1 admin role, 1 user, links them together.
Also idempotently adds internal e-sign demo templates + a sample rule (when migrations include esign tables).
"""

import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


OFFER_LETTER_HTML = """
<div style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1a1a1a;">
  <h2 style="margin-top:0;">Offer of employment</h2>
  <p>Dear {candidate_name},</p>
  <p>We are pleased to offer you the position of <strong>{job_title}</strong> at <strong>{company_name}</strong>.</p>
  <p>This letter uses merge fields — for example your team is listed as <strong>{department}</strong> and the role is based in <strong>{location}</strong>.</p>
  <p>Please review and sign electronically using the link we sent you.</p>
  <p style="margin-top:2rem;">Sincerely,<br/>{company_name}</p>
  <p style="font-size:12px;color:#666;margin-top:2rem;">Generated {today}</p>
</div>
""".strip()

NDA_HTML = """
<div style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1a1a1a;">
  <h2 style="margin-top:0;">Mutual confidentiality</h2>
  <p>This agreement is between <strong>{company_name}</strong> and <strong>{candidate_name}</strong> regarding discussions for the <strong>{job_title}</strong> opportunity.</p>
  <p>Both parties agree not to disclose proprietary information shared during the hiring process.</p>
  <p style="margin-top:2rem;">Date: {today}</p>
</div>
""".strip()

LOE_HTML = """
<div style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1a1a1a;">
  <h2 style="margin-top:0;">Letter of employment</h2>
  <p>Dear {candidate_name},</p>
  <p>This letter confirms an offer of employment for <strong>{job_title}</strong> at <strong>{company_name}</strong>, subject to completion of any pre-employment checks.</p>
  <p>Compensation and role details are set out in your separate offer letter. Please sign both documents when prompted.</p>
  <p style="margin-top:2rem;">{company_name}<br/>{today}</p>
</div>
""".strip()


def _ensure_esign_seed(db, account_id: int, now: datetime) -> bool:
    """
    Idempotent: add two sample templates + one account-wide rule (stage type = offer).
    Returns True if new rows were added.
    """
    try:
        from sqlalchemy import func, select

        from app.models.esign_template import EsignTemplate
        from app.models.esign_stage_rule import EsignStageRule
    except Exception:
        return False

    try:
        n = db.scalar(
            select(func.count()).select_from(EsignTemplate).where(EsignTemplate.account_id == account_id)
        )
    except Exception:
        return False

    if int(n or 0) > 0:
        return False

    t_offer = EsignTemplate(
        account_id=account_id,
        name="Sample offer letter",
        description="Seeded example — safe to edit or delete.",
        content_html=OFFER_LETTER_HTML,
        created_at=now,
        updated_at=now,
    )
    t_nda = EsignTemplate(
        account_id=account_id,
        name="Simple NDA",
        description="Seeded confidentiality snippet for interviews or offers.",
        content_html=NDA_HTML,
        created_at=now,
        updated_at=now,
    )
    t_loe = EsignTemplate(
        account_id=account_id,
        name="Letter of employment (LOE)",
        description="Seeded employment confirmation — pairs with offer letter at offer stage.",
        content_html=LOE_HTML,
        created_at=now,
        updated_at=now,
    )
    db.add(t_offer)
    db.add(t_nda)
    db.add(t_loe)
    db.flush()

    for tpl in (t_offer, t_loe):
        db.add(
            EsignStageRule(
                account_id=account_id,
                job_id=None,
                pipeline_stage_id=None,
                trigger_stage_type="offer",
                action_type="send_esign",
                template_id=tpl.id,
                is_active=True,
                created_at=now,
                updated_at=now,
            )
        )
    return True


def _ensure_loe_template_and_offer_rule(db, account_id: int, now: datetime) -> bool:
    """For accounts that already had e-sign seed (2 templates, 1 rule): add LOE + second offer rule."""
    try:
        from sqlalchemy import func, select

        from app.models.esign_template import EsignTemplate
        from app.models.esign_stage_rule import EsignStageRule
    except Exception:
        return False

    try:
        loe = db.execute(
            select(EsignTemplate).where(
                EsignTemplate.account_id == account_id,
                EsignTemplate.name == "Letter of employment (LOE)",
            )
        ).scalars().first()
    except Exception:
        return False

    changed = False
    if loe is None:
        loe = EsignTemplate(
            account_id=account_id,
            name="Letter of employment (LOE)",
            description="Seeded employment confirmation — pairs with offer letter at offer stage.",
            content_html=LOE_HTML,
            created_at=now,
            updated_at=now,
        )
        db.add(loe)
        db.flush()
        changed = True

    try:
        n = db.scalar(
            select(func.count())
            .select_from(EsignStageRule)
            .where(
                EsignStageRule.account_id == account_id,
                EsignStageRule.template_id == loe.id,
                EsignStageRule.trigger_stage_type == "offer",
            )
        )
    except Exception:
        return changed

    if int(n or 0) == 0:
        db.add(
            EsignStageRule(
                account_id=account_id,
                job_id=None,
                pipeline_stage_id=None,
                trigger_stage_type="offer",
                action_type="send_esign",
                template_id=loe.id,
                is_active=True,
                created_at=now,
                updated_at=now,
            )
        )
        changed = True
    return changed


def run_seeds() -> None:
    from config.database import SessionLocal
    from app.models.user import User
    from app.models.account import Account
    from app.models.account_user import AccountUser
    from app.models.role import Role
    from app.models.account_user_role import AccountUserRole

    db = SessionLocal()
    try:
        if User.find_by(db, email="admin@example.com"):
            acct = Account.find_by(db, slug="acme-corp")
            if acct:
                now = datetime.now(timezone.utc)
                added = _ensure_esign_seed(db, acct.id, now)
                more = _ensure_loe_template_and_offer_rule(db, acct.id, now)
                if added or more:
                    db.commit()
                if added:
                    print(
                        'Seeds: e-sign demo — “Sample offer letter”, “Simple NDA”, “Letter of employment (LOE)”, '
                        'and rules when a candidate enters any “offer” pipeline column (run `python manage.py worker`).'
                    )
                elif more:
                    print(
                        'Seeds: added “Letter of employment (LOE)” template and/or its offer-stage rule (idempotent).'
                    )
                else:
                    print("Seeds: already seeded, skipping.")
            else:
                print("Seeds: already seeded, skipping.")
            return

        now = datetime.now(timezone.utc)

        account = Account(
            name="Acme Corp",
            slug="acme-corp",
            plan="pro",
            status="active",
            settings={},
            created_at=now,
            updated_at=now,
        )
        db.add(account)
        db.flush()

        role = Role(
            account_id=account.id,
            name="Admin",
            slug="admin",
            description="Full access",
            created_at=now,
        )
        db.add(role)
        db.flush()

        user = User(
            email="admin@example.com",
            name="Admin User",
            status="active",
            created_at=now,
            updated_at=now,
        )
        user.set_password("password123")
        db.add(user)
        db.flush()

        au = AccountUser(
            account_id=account.id,
            user_id=user.id,
            status="active",
            joined_at=now,
            created_at=now,
        )
        db.add(au)
        db.flush()

        aur = AccountUserRole(account_user_id=au.id, role_id=role.id)
        db.add(aur)

        _ensure_esign_seed(db, account.id, now)

        db.commit()

        print(f"Seeds: created account '{account.name}', user '{user.email}' with role '{role.name}'")
        print("Login: admin@example.com / password123")
        print(
            'E-sign: seeded offer letter, NDA, letter of employment (LOE), and two rules for stage type “offer”. '
            'Run `python manage.py worker` in another terminal so documents queue when candidates move columns.'
        )
    finally:
        db.close()
