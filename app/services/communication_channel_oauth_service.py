"""Google OAuth for Gmail communication channels (authorize URL + callback handling)."""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from typing import Any
from urllib.parse import quote, urlencode

import httpx
from sqlalchemy import select

from app.models.communication_channel import CommunicationChannel
from app.services.base_service import BaseService
from app.services.channels.email_channel_provider import _merge_email_defaults
from config.settings import get_settings


STATE_MAX_AGE_SEC = 600


def _sign_state(payload: dict[str, Any], secret: str) -> str:
    raw = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    raw_b = raw.encode()
    sig = hmac.new(secret.encode(), raw_b, hashlib.sha256).hexdigest()
    combined = raw + "|" + sig
    return base64.urlsafe_b64encode(combined.encode()).decode().rstrip("=")


def _verify_state(token: str, secret: str) -> dict[str, Any]:
    pad = "=" * (-len(token) % 4)
    combined = base64.urlsafe_b64decode(token + pad).decode()
    raw_json, sig = combined.split("|", 1)
    raw_b = raw_json.encode()
    expected = hmac.new(secret.encode(), raw_b, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected):
        raise ValueError("Invalid state signature")
    obj = json.loads(raw_json)
    ts = int(obj.get("ts", 0))
    if time.time() - ts > STATE_MAX_AGE_SEC:
        raise ValueError("State expired")
    return obj


class CommunicationChannelOauthService(BaseService):
    def google_authorization_url(self, account_id: int, user_id: int) -> dict:
        s = get_settings()
        cid = (s.GOOGLE_OAUTH_CLIENT_ID or "").strip()
        redir = (s.GOOGLE_OAUTH_REDIRECT_URI or "").strip()
        if not cid or not redir:
            return self.failure(
                "Google OAuth is not configured. Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_REDIRECT_URI."
            )
        state = _sign_state(
            {"aid": account_id, "uid": user_id, "ts": int(time.time())},
            s.SECRET_KEY,
        )
        params = {
            "client_id": cid,
            "redirect_uri": redir,
            "response_type": "code",
            "scope": "https://mail.google.com/",
            "access_type": "offline",
            "prompt": "consent",
            "include_granted_scopes": "true",
            "state": state,
        }
        url = "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params)
        return self.success({"authorization_url": url})

    def google_callback(self, code: str | None, state: str | None, oauth_error: str | None) -> dict:
        s = get_settings()
        frontend = (s.FRONTEND_PUBLIC_URL or "").strip().rstrip("/") or "http://localhost:5173"

        def email_path(account_id: int | None, query: str) -> str:
            if account_id is not None:
                return f"/account/{account_id}/settings/communication-channels/email{query}"
            return "/" + query.lstrip("?")

        def redirect(path_suffix: str) -> dict:
            return {"redirect_to": f"{frontend}{path_suffix}"}

        payload: dict[str, Any] | None = None
        if state:
            try:
                payload = _verify_state(state, s.SECRET_KEY)
            except ValueError:
                payload = None

        account_id = int(payload["aid"]) if payload else None

        if oauth_error:
            q = "?oauth_error=" + quote(oauth_error, safe="")
            return redirect(email_path(account_id, q))

        if not state or not payload:
            return redirect(email_path(None, "?oauth_error=invalid_state"))

        if not code:
            return redirect(email_path(account_id, "?oauth_error=missing_code"))

        account_id = int(payload["aid"])
        user_id = int(payload["uid"])

        cid = (s.GOOGLE_OAUTH_CLIENT_ID or "").strip()
        csec = (s.GOOGLE_OAUTH_CLIENT_SECRET or "").strip()
        redir = (s.GOOGLE_OAUTH_REDIRECT_URI or "").strip()
        if not cid or not csec or not redir:
            return redirect("/settings/communication-channels/email?oauth_error=server_config")

        try:
            tok = httpx.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": cid,
                    "client_secret": csec,
                    "redirect_uri": redir,
                    "grant_type": "authorization_code",
                },
                timeout=30.0,
            )
            tok.raise_for_status()
            tokens = tok.json()
        except Exception as e:
            return redirect(
                "/settings/communication-channels/email?oauth_error=" + quote(str(e)[:200], safe="")
            )

        access = tokens.get("access_token") or ""
        refresh = tokens.get("refresh_token") or ""
        if not access:
            return redirect("/settings/communication-channels/email?oauth_error=no_access_token")

        try:
            ui = httpx.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access}"},
                timeout=20.0,
            )
            ui.raise_for_status()
            profile = ui.json()
        except Exception:
            profile = {}

        email = (profile.get("email") or "").strip() or "Gmail"
        name = (profile.get("name") or "").strip()
        display = email if "@" in email else None

        cfg = _merge_email_defaults("gmail", {"auth_type": "oauth2"})
        creds: dict[str, Any] = {
            "access_token": access,
            "refresh_token": refresh,
            "client_id": cid,
            "client_secret": csec,
            "username": email if "@" in email else "",
            "email": email if "@" in email else "",
        }

        stmt = select(CommunicationChannel).where(
            CommunicationChannel.account_id == account_id,
            CommunicationChannel.channel_type == "email",
            CommunicationChannel.provider == "gmail",
            CommunicationChannel.deleted_at.is_(None),
        )
        all_gmail = list(self.db.execute(stmt).scalars().all())

        match: CommunicationChannel | None = None
        if display:
            for row in all_gmail:
                ce = (row.credentials or {}).get("email") or (row.credentials or {}).get("username")
                if isinstance(ce, str) and ce.lower() == display.lower():
                    match = row
                    break

        label = f"Gmail ({email})" if "@" in email else "Gmail"
        if match:
            match.name = label
            match.display_email = display
            match.display_name = name or match.display_name
            match.config = cfg
            match.credentials = creds
            match.status = "pending_verification"
            match.error_message = None
            match.save(self.db)
        else:
            ch = CommunicationChannel(
                account_id=account_id,
                name=label,
                channel_type="email",
                provider="gmail",
                display_email=display,
                display_name=name or None,
                config=cfg,
                credentials=creds,
                status="pending_verification",
                error_message=None,
                is_default=len(all_gmail) == 0,
                created_by=user_id,
            )
            ch.save(self.db)
            if ch.is_default:
                for row in all_gmail:
                    if row.id != ch.id and row.is_default:
                        row.is_default = False
                        row.save(self.db)

        return redirect(
            f"/account/{account_id}/settings/communication-channels/email?oauth=gmail_ok"
        )
