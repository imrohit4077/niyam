"""
Database seeding. Rails equivalent: db/seeds.rb
Creates: 1 account, 1 admin role, 1 user, links them together.
Also idempotently adds internal e-sign demo templates + a sample rule (when migrations include esign tables).
"""

import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def _esign_block_templates():
    """Rich ATS block JSON + matching HTML for new accounts (see app.helpers.esign_blocks)."""
    from app.helpers.esign_blocks import document_to_html, normalize_document

    offer_raw = {
        "version": 1,
        "blocks": [
            {
                "type": "text",
                "content": "Offer of employment",
                "fontSize": 22,
                "color": "#0f172a",
                "align": "left",
            },
            {
                "type": "text",
                "content": "Dear {candidate_name},",
                "fontSize": 15,
                "color": "#111827",
                "align": "left",
            },
            {
                "type": "text",
                "content": (
                    "We are pleased to offer you the position of {job_title} at {company_name}. "
                    "This offer is contingent on satisfactory completion of any background checks."
                ),
                "fontSize": 15,
                "color": "#111827",
                "align": "left",
            },
            {
                "type": "section",
                "title": "Role details",
                "content": (
                    "Department: {department}\n"
                    "Work location: {location}\n"
                    "Requisition: {requisition_id}"
                ),
                "bodyFontSize": 14,
                "bodyColor": "#374151",
                "bodyAlign": "left",
            },
            {
                "type": "section",
                "title": "Compensation",
                "content": (
                    "The compensation band discussed for this role is {salary_range}. "
                    "Final amounts and equity (if any) appear in your written offer packet."
                ),
                "bodyFontSize": 14,
                "bodyColor": "#374151",
                "bodyAlign": "left",
            },
            {
                "type": "text",
                "content": (
                    "Please review this letter and sign electronically when you receive the secure link.\n\n"
                    "Sincerely,\n{company_name}"
                ),
                "fontSize": 15,
                "color": "#111827",
                "align": "left",
            },
            {"type": "button", "label": "Sign electronically", "href": "#", "align": "center"},
            {
                "type": "text",
                "content": "Generated {today}",
                "fontSize": 12,
                "color": "#6b7280",
                "align": "left",
            },
        ],
    }
    nda_raw = {
        "version": 1,
        "blocks": [
            {
                "type": "text",
                "content": "Mutual non-disclosure",
                "fontSize": 20,
                "color": "#0f172a",
                "align": "left",
            },
            {
                "type": "text",
                "content": (
                    "This mutual confidentiality agreement is between {company_name} and {candidate_name} "
                    "in connection with the {job_title} opportunity."
                ),
                "fontSize": 15,
                "color": "#111827",
                "align": "left",
            },
            {
                "type": "section",
                "title": "Obligations",
                "content": (
                    "Each party agrees to hold in confidence any non-public information shared during interviews, "
                    "assignments, or offer discussions, and to use such information solely for evaluating the role.\n\n"
                    "This does not restrict either party from using general skills or publicly known information."
                ),
                "bodyFontSize": 14,
                "bodyColor": "#374151",
                "bodyAlign": "left",
            },
            {
                "type": "text",
                "content": "If you agree, sign when prompted. Questions? Reply to your recruiting contact at {company_name}.",
                "fontSize": 14,
                "color": "#111827",
                "align": "left",
            },
            {"type": "button", "label": "Review & sign", "href": "#", "align": "center"},
            {
                "type": "text",
                "content": "Effective date: {today}",
                "fontSize": 12,
                "color": "#6b7280",
                "align": "left",
            },
        ],
    }
    loe_raw = {
        "version": 1,
        "blocks": [
            {
                "type": "text",
                "content": "Letter of employment",
                "fontSize": 20,
                "color": "#0f172a",
                "align": "left",
            },
            {
                "type": "text",
                "content": "Dear {candidate_name},",
                "fontSize": 15,
                "color": "#111827",
                "align": "left",
            },
            {
                "type": "text",
                "content": (
                    "This letter confirms that {company_name} intends to employ you in the role of {job_title}, "
                    "subject to completion of any pre-employment requirements."
                ),
                "fontSize": 15,
                "color": "#111827",
                "align": "left",
            },
            {
                "type": "section",
                "title": "Next steps",
                "content": (
                    "• Complete any outstanding checks listed by HR.\n"
                    "• Sign your formal offer letter and this confirmation when you receive the e-sign link.\n"
                    "• Target start date and reporting manager will be confirmed by HR."
                ),
                "bodyFontSize": 14,
                "bodyColor": "#374151",
                "bodyAlign": "left",
            },
            {
                "type": "text",
                "content": (
                    "Compensation specifics remain as stated in your offer letter ({salary_range} where applicable)."
                ),
                "fontSize": 14,
                "color": "#111827",
                "align": "left",
            },
            {"type": "button", "label": "Confirm & sign", "href": "#", "align": "center"},
            {
                "type": "text",
                "content": "{company_name}\n{today}",
                "fontSize": 13,
                "color": "#6b7280",
                "align": "left",
            },
        ],
    }
    offer_doc = normalize_document(offer_raw)
    nda_doc = normalize_document(nda_raw)
    loe_doc = normalize_document(loe_raw)
    return (
        (document_to_html(offer_doc), offer_doc),
        (document_to_html(nda_doc), nda_doc),
        (document_to_html(loe_doc), loe_doc),
    )


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

    (offer_html, offer_doc), (nda_html, nda_doc), (loe_html, loe_doc) = _esign_block_templates()

    t_offer = EsignTemplate(
        account_id=account_id,
        name="Sample offer letter",
        description="Seeded example — safe to edit or delete.",
        content_html=offer_html,
        content_blocks=offer_doc,
        created_at=now,
        updated_at=now,
    )
    t_nda = EsignTemplate(
        account_id=account_id,
        name="Simple NDA",
        description="Seeded confidentiality snippet for interviews or offers.",
        content_html=nda_html,
        content_blocks=nda_doc,
        created_at=now,
        updated_at=now,
    )
    t_loe = EsignTemplate(
        account_id=account_id,
        name="Letter of employment (LOE)",
        description="Seeded employment confirmation — pairs with offer letter at offer stage.",
        content_html=loe_html,
        content_blocks=loe_doc,
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
        *_, (loe_html, loe_doc) = _esign_block_templates()
        loe = EsignTemplate(
            account_id=account_id,
            name="Letter of employment (LOE)",
            description="Seeded employment confirmation — pairs with offer letter at offer stage.",
            content_html=loe_html,
            content_blocks=loe_doc,
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


def _ensure_superadmin_role_for_admin(db, account_id: int, now: datetime) -> bool:
    """Idempotent: add superadmin role and assign it to admin@example.com alongside admin."""
    from app.models.user import User
    from app.models.role import Role
    from app.models.account_user import AccountUser
    from app.models.account_user_role import AccountUserRole

    user = User.find_by(db, email="admin@example.com")
    if not user:
        return False
    au = AccountUser.find_by(db, user_id=user.id, account_id=account_id)
    if not au:
        return False
    role = Role.find_by(db, account_id=account_id, slug="superadmin")
    if not role:
        role = Role(
            account_id=account_id,
            name="Super Admin",
            slug="superadmin",
            description="Highest workspace access",
            created_at=now,
        )
        db.add(role)
        db.flush()
    existing = AccountUserRole.find_by(db, account_user_id=au.id, role_id=role.id)
    if not existing:
        db.add(AccountUserRole(account_user_id=au.id, role_id=role.id))
        return True
    return False


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
                sb = _ensure_superadmin_role_for_admin(db, acct.id, now)
                added = _ensure_esign_seed(db, acct.id, now)
                more = _ensure_loe_template_and_offer_rule(db, acct.id, now)
                if added or more or sb:
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

        super_role = Role(
            account_id=account.id,
            name="Super Admin",
            slug="superadmin",
            description="Highest workspace access",
            created_at=now,
        )
        db.add(super_role)
        db.flush()
        db.add(AccountUserRole(account_user_id=au.id, role_id=super_role.id))

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
