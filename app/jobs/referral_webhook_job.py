"""POST eligible bonus to HRIS webhook when configured on the account."""
from __future__ import annotations

import hashlib
import hmac
import json

import httpx

from config.celery import celery_app
from config.database import SessionLocal
from config.settings import get_settings
from app.helpers.logger import get_logger
from app.models.account import Account
from app.models.referral_bonus import ReferralBonus
from app.models.user import User
from app.services.referral_account_settings_service import merged_referral_settings

logger = get_logger(__name__)


@celery_app.task(name="forge.referral_bonus_eligible_webhook")
def referral_bonus_eligible_webhook(bonus_id: int) -> None:
    db = SessionLocal()
    try:
        bonus = db.get(ReferralBonus, bonus_id)
        if not bonus or bonus.status != "eligible":
            return
        acc = db.get(Account, bonus.account_id)
        settings = merged_referral_settings(acc.settings if acc else {})
        url = (settings.get("hris_webhook_url") or "").strip()
        if not url:
            return
        referrer = db.get(User, bonus.referrer_user_id)
        if not referrer:
            return
        body = {
            "event": "referral_bonus.eligible",
            "bonus_id": bonus.id,
            "account_id": bonus.account_id,
            "application_id": bonus.application_id,
            "referrer_user_id": bonus.referrer_user_id,
            "referrer_email": referrer.email,
            "amount": float(bonus.amount),
            "currency": bonus.currency,
            "eligible_after": bonus.eligible_after.isoformat() if bonus.eligible_after else None,
        }
        raw = json.dumps(body, sort_keys=True, separators=(",", ":"))
        headers = {"Content-Type": "application/json"}
        secret = (settings.get("hris_webhook_secret") or "").strip()
        if secret:
            sig = hmac.new(secret.encode("utf-8"), raw.encode("utf-8"), hashlib.sha256).hexdigest()
            headers["X-Forge-Signature"] = f"sha256={sig}"
        timeout = 10.0 if get_settings().APP_ENV == "development" else 30.0
        with httpx.Client(timeout=timeout) as client:
            r = client.post(url, content=raw.encode("utf-8"), headers=headers)
            r.raise_for_status()
        bonus.hris_sync_status = "synced"
        bonus.save(db)
    except Exception:
        logger.warning("referral_bonus_eligible_webhook failed", exc_info=True, extra={"bonus_id": bonus_id})
        try:
            failed = db.get(ReferralBonus, bonus_id)
            if failed:
                failed.hris_sync_status = "failed"
                failed.save(db)
        except Exception:
            pass
    finally:
        db.close()
