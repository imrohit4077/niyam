"""
Test SMTP + IMAP connectivity for email communication channels.
Supports basic auth (app password / SMTP credentials) and OAuth2 (XOAUTH2) for Gmail and Outlook.
"""
from __future__ import annotations

import base64
import imaplib
import smtplib
from typing import Any

import httpx


def _merge_email_defaults(
    provider: str,
    config: dict[str, Any],
) -> dict[str, Any]:
    """Fill missing host/port defaults for known providers."""
    out = dict(config) if isinstance(config, dict) else {}
    defaults: dict[str, dict[str, Any]] = {
        "gmail": {
            "smtp_host": "smtp.gmail.com",
            "smtp_port": 587,
            "imap_host": "imap.gmail.com",
            "imap_port": 993,
            "smtp_use_tls": True,
            "imap_use_ssl": True,
        },
        "outlook": {
            "smtp_host": "smtp.office365.com",
            "smtp_port": 587,
            "imap_host": "outlook.office365.com",
            "imap_port": 993,
            "smtp_use_tls": True,
            "imap_use_ssl": True,
        },
    }
    base = defaults.get(provider, {})
    for k, v in base.items():
        out.setdefault(k, v)
    out.setdefault("auth_type", "app_password")
    return out


def refresh_google_access_token(
    client_id: str,
    client_secret: str,
    refresh_token: str,
) -> dict[str, Any]:
    r = httpx.post(
        "https://oauth2.googleapis.com/token",
        data={
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        },
        timeout=30.0,
    )
    r.raise_for_status()
    return r.json()


def refresh_microsoft_access_token(
    tenant_id: str,
    client_id: str,
    client_secret: str,
    refresh_token: str,
) -> dict[str, Any]:
    url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
    r = httpx.post(
        url,
        data={
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        },
        timeout=30.0,
    )
    r.raise_for_status()
    return r.json()


def _smtp_xoauth2(host: str, port: int, email: str, access_token: str, use_starttls: bool = True) -> None:
    auth_string = f"user={email}\1auth=Bearer {access_token}\1\1"
    encoded = base64.b64encode(auth_string.encode()).decode()
    smtp = smtplib.SMTP(host, port, timeout=45)
    try:
        smtp.ehlo()
        if use_starttls and port != 465:
            smtp.starttls()
            smtp.ehlo()
        code, resp = smtp.docmd("AUTH", f"XOAUTH2 {encoded}")
        if code not in (235, 250):
            raise smtplib.SMTPException(f"SMTP XOAUTH2 failed: {code} {resp!r}")
    finally:
        try:
            smtp.quit()
        except Exception:
            pass


def _imap_xoauth2(host: str, port: int, email: str, access_token: str) -> None:
    auth_string = f"user={email}\1auth=Bearer {access_token}\1\1"

    def _auth(_challenge: bytes) -> bytes:
        return base64.b64encode(auth_string.encode())

    conn = imaplib.IMAP4_SSL(host, port, timeout=45)
    try:
        conn.authenticate("XOAUTH2", _auth)
    finally:
        try:
            conn.logout()
        except Exception:
            pass


def _smtp_basic(
    host: str,
    port: int,
    username: str,
    password: str,
    use_starttls: bool,
) -> None:
    if port == 465:
        smtp = smtplib.SMTP_SSL(host, port, timeout=45)
    else:
        smtp = smtplib.SMTP(host, port, timeout=45)
        if use_starttls:
            smtp.starttls()
    try:
        smtp.login(username, password)
    finally:
        try:
            smtp.quit()
        except Exception:
            pass


def _imap_basic(
    host: str,
    port: int,
    username: str,
    password: str,
    use_ssl: bool,
) -> None:
    if use_ssl or port == 993:
        imap = imaplib.IMAP4_SSL(host, port, timeout=45)
    else:
        imap = imaplib.IMAP4(host, port, timeout=45)
        imap.starttls()
    try:
        imap.login(username, password)
    finally:
        try:
            imap.logout()
        except Exception:
            pass


def _resolve_access_token_oauth2(
    provider: str,
    cfg: dict[str, Any],
    creds: dict[str, Any],
) -> tuple[str, dict[str, Any] | None]:
    """
    Return (access_token, token_patch).
    token_patch is merged into credentials if refresh produced new tokens.
    """
    access = (creds.get("access_token") or "").strip()
    refresh = (creds.get("refresh_token") or "").strip()
    client_id = (creds.get("client_id") or "").strip()
    client_secret = (creds.get("client_secret") or "").strip()

    if access and not refresh:
        return access, None

    if refresh and client_id and client_secret:
        if provider == "gmail":
            data = refresh_google_access_token(client_id, client_secret, refresh)
            new_access = data.get("access_token", "")
            patch: dict[str, Any] = {}
            if new_access:
                patch["access_token"] = new_access
            return str(new_access), patch or None
        if provider == "outlook":
            tenant = (cfg.get("tenant_id") or "common").strip() or "common"
            data = refresh_microsoft_access_token(tenant, client_id, client_secret, refresh)
            new_access = data.get("access_token", "")
            patch = {}
            if new_access:
                patch["access_token"] = new_access
            if data.get("refresh_token"):
                patch["refresh_token"] = data["refresh_token"]
            return str(new_access), patch or None

    if access:
        return access, None

    raise ValueError("OAuth2: provide access_token or refresh_token with client_id and client_secret")


def test_email_channel(
    provider: str,
    config: dict[str, Any],
    credentials: dict[str, Any],
) -> dict[str, Any]:
    """
    Verify SMTP and IMAP for the given provider/config/credentials.
    On success: { "ok": True, "credential_patch": {...} } (patch may update OAuth tokens).
    On failure: { "ok": False, "error": "..." }
    """
    try:
        cfg = _merge_email_defaults(provider, config)
        auth_type = (cfg.get("auth_type") or "app_password").lower()
        creds = dict(credentials) if isinstance(credentials, dict) else {}

        smtp_host = str(cfg.get("smtp_host") or "").strip()
        smtp_port = int(cfg.get("smtp_port") or 587)
        imap_host = str(cfg.get("imap_host") or "").strip()
        imap_port = int(cfg.get("imap_port") or 993)
        smtp_use_tls = bool(cfg.get("smtp_use_tls", True))
        imap_use_ssl = bool(cfg.get("imap_use_ssl", True))

        if not smtp_host or not imap_host:
            return {"ok": False, "error": "smtp_host and imap_host are required"}

        email_addr = (creds.get("username") or creds.get("email") or "").strip()
        if not email_addr and creds.get("display_email"):
            email_addr = str(creds.get("display_email")).strip()

        if auth_type == "oauth2":
            access, patch = _resolve_access_token_oauth2(provider, cfg, creds)
            if not access:
                return {"ok": False, "error": "Could not obtain OAuth2 access token"}
            if not email_addr:
                return {"ok": False, "error": "username or email is required for OAuth2"}

            _smtp_xoauth2(smtp_host, smtp_port, email_addr, access, use_starttls=smtp_use_tls and smtp_port != 465)
            _imap_xoauth2(imap_host, imap_port, email_addr, access)
            return {"ok": True, "credential_patch": patch}

        # Basic / app password
        password = (creds.get("password") or creds.get("app_password") or creds.get("smtp_password") or "").strip()
        username = (creds.get("username") or creds.get("email") or "").strip()
        if not username:
            return {"ok": False, "error": "username or email is required"}
        if not password:
            return {"ok": False, "error": "password is required"}

        _smtp_basic(smtp_host, smtp_port, username, password, use_starttls=smtp_use_tls and smtp_port != 465)
        _imap_basic(imap_host, imap_port, username, password, use_ssl=imap_use_ssl)
        return {"ok": True, "credential_patch": None}

    except Exception as e:
        msg = str(e) or e.__class__.__name__
        return {"ok": False, "error": msg}
