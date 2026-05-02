"""
Authenticatable concern: authenticate_user, require_admin, require_owner.

Works with request.state.current_user as dict (JWT payload) or model instance.
"""

from collections.abc import Sequence
from typing import Any

from fastapi import HTTPException


class Authenticatable:
    """Mixin for controllers that need current_user, require_admin, require_owner."""

    def authenticate_user(self) -> None:
        """Set self.current_user from request.state or raise 401."""
        user = getattr(self.request.state, "current_user", None)
        if not user:
            raise HTTPException(status_code=401, detail="Authentication required")
        self.current_user = user

    def _role(self) -> str:
        """Current user role (dict or model)."""
        if isinstance(self.current_user, dict):
            return (self.current_user.get("role") or "").lower()
        return (getattr(self.current_user, "role", None) or "").lower()

    def _user_id(self) -> Any:
        """Current user id (dict or model)."""
        if isinstance(self.current_user, dict):
            sub = self.current_user.get("sub")
            return int(sub) if sub else None
        return getattr(self.current_user, "id", None)

    def _perms(self) -> set[str]:
        """Permission keys from JWT (workspace scope only; job-scoped use has_permission with job_id)."""
        if isinstance(self.current_user, dict):
            raw = self.current_user.get("perms")
            if isinstance(raw, list):
                return {str(x) for x in raw}
        return set()

    def has_permission(
        self,
        resource: str,
        action: str,
        *,
        account_id: int | None = None,
        job_id: int | None = None,
    ) -> bool:
        """Check resource:action. Admins bypass. With job_id + account_id + db, merges job hiring team grants."""
        if not getattr(self, "current_user", None):
            return False
        if self._role() in ("admin", "superadmin", "site_admin"):
            return True
        key = f"{resource}:{action}"
        db = getattr(self, "db", None)
        if job_id is not None and account_id is not None and db is not None:
            uid = self._user_id()
            if uid is None:
                return False
            from app.models.account_user import AccountUser
            from app.services.permission_resolution_service import PermissionResolutionService

            au = AccountUser.find_by(db, user_id=uid, account_id=account_id)
            if not au:
                return False
            eff = PermissionResolutionService(db).effective_keys(account_id, int(uid), au.id, job_id)
            return key in eff
        return key in self._perms()

    def require_permission(
        self,
        resource: str,
        action: str,
        *,
        account_id: int | None = None,
        job_id: int | None = None,
    ) -> None:
        if not getattr(self, "current_user", None):
            self.authenticate_user()
        if not self.has_permission(resource, action, account_id=account_id, job_id=job_id):
            raise HTTPException(status_code=403, detail="Not allowed")

    def has_any_permission(
        self,
        specs: Sequence[tuple[str, str]],
        *,
        account_id: int | None = None,
        job_id: int | None = None,
    ) -> bool:
        if not getattr(self, "current_user", None):
            return False
        if self._role() in ("admin", "superadmin", "site_admin"):
            return True
        return any(self.has_permission(r, a, account_id=account_id, job_id=job_id) for r, a in specs)

    def require_any_permission(
        self,
        specs: Sequence[tuple[str, str]],
        *,
        account_id: int,
        job_id: int | None = None,
    ) -> None:
        if not getattr(self, "current_user", None):
            self.authenticate_user()
        if not self.has_any_permission(specs, account_id=account_id, job_id=job_id):
            raise HTTPException(status_code=403, detail="Not allowed")

    def require_admin(self) -> None:
        """Raise 403 if current_user is not admin or superadmin."""
        if not getattr(self, "current_user", None):
            self.authenticate_user()
        if self._role() not in ("admin", "superadmin", "site_admin"):
            raise HTTPException(status_code=403, detail="Admin required")

    def require_owner(self, resource: Any) -> None:
        """Raise 403 if current_user does not own the resource (resource.user_id == current_user.id)."""
        if not getattr(self, "current_user", None):
            self.authenticate_user()
        owner_id = getattr(resource, "user_id", None)
        if owner_id is None:
            owner_id = getattr(resource, "id", None)
        uid = self._user_id()
        if uid is None:
            raise HTTPException(status_code=403, detail="Not authorized to access this resource")
        is_admin = self._role() in ("admin", "superadmin", "site_admin")
        if owner_id != uid and not is_admin:
            raise HTTPException(status_code=403, detail="Not authorized to access this resource")
