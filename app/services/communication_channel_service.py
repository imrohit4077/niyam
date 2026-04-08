"""CRUD and connection tests for account communication channels."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.communication_channel import CommunicationChannel
from app.services.base_service import BaseService
from app.services.channels.email_channel_provider import _merge_email_defaults, test_email_channel


ALLOWED_CHANNEL_TYPES = frozenset({"email"})
ALLOWED_EMAIL_PROVIDERS = frozenset({"gmail", "outlook", "smtp"})

# Empty PATCH values for these keys mean "leave existing secret unchanged"
_SECRET_CREDENTIAL_KEYS = frozenset(
    {"password", "app_password", "smtp_password", "imap_password", "client_secret", "refresh_token", "access_token"}
)


def _merge_credentials_patch(merged: dict[str, Any], patch: dict[str, Any]) -> None:
    for k, v in patch.items():
        if k in _SECRET_CREDENTIAL_KEYS and (v is None or (isinstance(v, str) and not v.strip())):
            continue
        merged[k] = v


def _mask_credentials(creds: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(creds, dict) or not creds:
        return {"has_password": False, "has_oauth": False}
    has_pw = bool(
        creds.get("password") or creds.get("app_password") or creds.get("smtp_password")
    )
    has_oauth = bool(creds.get("access_token") or creds.get("refresh_token"))
    hint = (creds.get("username") or creds.get("email") or "") or ""
    username_hint = None
    if isinstance(hint, str) and len(hint) >= 2:
        username_hint = hint[:2] + "***"
    elif isinstance(hint, str) and hint:
        username_hint = "*"
    return {"has_password": has_pw, "has_oauth": has_oauth, "username_hint": username_hint}


def _public_row(ch: CommunicationChannel) -> dict[str, Any]:
    d = ch.to_dict()
    d["credentials"] = _mask_credentials(d.get("credentials") or {})
    return d


class CommunicationChannelService(BaseService):
    def _scoped(
        self, account_id: int, channel_id: int
    ) -> CommunicationChannel | None:
        ch = self.db.get(CommunicationChannel, channel_id)
        if not ch or ch.account_id != account_id or ch.deleted_at is not None:
            return None
        return ch

    def list_channels(
        self, account_id: int, channel_type: str | None = None
    ) -> dict:
        stmt = (
            select(CommunicationChannel)
            .where(
                CommunicationChannel.account_id == account_id,
                CommunicationChannel.deleted_at.is_(None),
            )
            .order_by(CommunicationChannel.created_at.desc())
        )
        if channel_type:
            stmt = stmt.where(CommunicationChannel.channel_type == channel_type)
        rows = list(self.db.execute(stmt).scalars().all())
        return self.success([_public_row(r) for r in rows])

    def get_channel(self, account_id: int, channel_id: int) -> dict:
        ch = self._scoped(account_id, channel_id)
        if not ch:
            return self.failure("Channel not found")
        return self.success(_public_row(ch))

    def create_channel(
        self,
        account_id: int,
        user_id: int | None,
        body: dict[str, Any],
    ) -> dict:
        ct = (body.get("channel_type") or "email").strip()
        prov = (body.get("provider") or "").strip().lower()
        name = (body.get("name") or "").strip()
        if ct not in ALLOWED_CHANNEL_TYPES:
            return self.failure("Unsupported channel_type")
        if prov not in ALLOWED_EMAIL_PROVIDERS:
            return self.failure("Unsupported provider for email channel")
        if not name:
            return self.failure("name is required")

        raw_cfg = body.get("config") if isinstance(body.get("config"), dict) else {}
        cfg = _merge_email_defaults(prov, raw_cfg)
        creds = body.get("credentials") if isinstance(body.get("credentials"), dict) else {}

        existing = self._count_for_type(account_id, ct)
        is_default = body.get("is_default")
        if is_default is None:
            is_default = existing == 0
        else:
            is_default = bool(is_default)

        ch = CommunicationChannel(
            account_id=account_id,
            name=name,
            channel_type=ct,
            provider=prov,
            display_email=body.get("display_email"),
            display_name=body.get("display_name"),
            config=cfg,
            credentials=creds,
            status="pending_verification",
            error_message=None,
            is_default=is_default,
            created_by=user_id,
        )
        ch.save(self.db)

        if is_default:
            self._clear_other_defaults(account_id, ct, ch.id)

        return self.success(_public_row(ch))

    def update_channel(
        self, account_id: int, channel_id: int, body: dict[str, Any]
    ) -> dict:
        ch = self._scoped(account_id, channel_id)
        if not ch:
            return self.failure("Channel not found")

        if "name" in body and body["name"] is not None:
            n = str(body["name"]).strip()
            if not n:
                return self.failure("name cannot be empty")
            ch.name = n
        if "display_email" in body:
            ch.display_email = body["display_email"]
        if "display_name" in body:
            ch.display_name = body["display_name"]
        if "config" in body and isinstance(body["config"], dict):
            ch.config = _merge_email_defaults(ch.provider, body["config"])
        if "credentials" in body and isinstance(body["credentials"], dict):
            merged = dict(ch.credentials or {})
            _merge_credentials_patch(merged, body["credentials"])
            ch.credentials = merged
        if "is_default" in body and body["is_default"] is not None:
            ch.is_default = bool(body["is_default"])
            if ch.is_default:
                self._clear_other_defaults(account_id, ch.channel_type, ch.id)

        ch.status = "pending_verification"
        ch.error_message = None
        ch.verified_at = None
        ch.save(self.db)

        if ch.is_default:
            self._clear_other_defaults(account_id, ch.channel_type, ch.id)

        return self.success(_public_row(ch))

    def delete_channel(self, account_id: int, channel_id: int) -> dict:
        ch = self._scoped(account_id, channel_id)
        if not ch:
            return self.failure("Channel not found")

        was_default = ch.is_default
        ctype = ch.channel_type
        ch.is_default = False
        ch.soft_delete(self.db)

        if was_default:
            self._promote_new_default(account_id, ctype)

        return self.success({"deleted": True})

    def set_default(self, account_id: int, channel_id: int) -> dict:
        ch = self._scoped(account_id, channel_id)
        if not ch:
            return self.failure("Channel not found")
        ch.is_default = True
        ch.save(self.db)
        self._clear_other_defaults(account_id, ch.channel_type, ch.id)
        return self.success(_public_row(ch))

    def test_connection(self, account_id: int, channel_id: int) -> dict:
        ch = self._scoped(account_id, channel_id)
        if not ch:
            return self.failure("Channel not found")
        if ch.channel_type != "email":
            return self.failure("Connection test not implemented for this channel type")

        result = test_email_channel(ch.provider, ch.config or {}, ch.credentials or {})
        if not result.get("ok"):
            err = result.get("error") or "Connection failed"
            ch.status = "error"
            ch.error_message = err
            ch.save(self.db)
            return self.failure(err)

        patch = result.get("credential_patch")
        if isinstance(patch, dict) and patch:
            merged = dict(ch.credentials or {})
            merged.update(patch)
            ch.credentials = merged

        ch.status = "active"
        ch.error_message = None
        ch.verified_at = datetime.now(timezone.utc)
        ch.last_used_at = ch.verified_at
        ch.save(self.db)
        return self.success(_public_row(ch))

    def _count_for_type(self, account_id: int, channel_type: str) -> int:
        stmt = select(CommunicationChannel).where(
            CommunicationChannel.account_id == account_id,
            CommunicationChannel.channel_type == channel_type,
            CommunicationChannel.deleted_at.is_(None),
        )
        return len(list(self.db.execute(stmt).scalars().all()))

    def _clear_other_defaults(
        self, account_id: int, channel_type: str, keep_id: int
    ) -> None:
        stmt = select(CommunicationChannel).where(
            CommunicationChannel.account_id == account_id,
            CommunicationChannel.channel_type == channel_type,
            CommunicationChannel.deleted_at.is_(None),
            CommunicationChannel.id != keep_id,
            CommunicationChannel.is_default.is_(True),
        )
        for other in self.db.execute(stmt).scalars().all():
            other.is_default = False
            self.db.add(other)
        self.db.commit()

    def _promote_new_default(self, account_id: int, channel_type: str) -> None:
        stmt = (
            select(CommunicationChannel)
            .where(
                CommunicationChannel.account_id == account_id,
                CommunicationChannel.channel_type == channel_type,
                CommunicationChannel.deleted_at.is_(None),
            )
            .order_by(CommunicationChannel.updated_at.desc())
            .limit(1)
        )
        row = self.db.execute(stmt).scalars().first()
        if row:
            row.is_default = True
            row.save(self.db)
