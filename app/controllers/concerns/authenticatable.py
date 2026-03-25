"""
Authenticatable concern: authenticate_user, require_admin, require_owner.
Rails equivalent: before_action :authenticate_user! + current_user
Works with request.state.current_user as dict (JWT payload) or model instance.
"""

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

    def require_admin(self) -> None:
        """Raise 403 if current_user is not admin or superadmin."""
        if not getattr(self, "current_user", None):
            self.authenticate_user()
        if self._role() not in ("admin", "superadmin"):
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
        is_admin = self._role() in ("admin", "superadmin")
        if owner_id != uid and not is_admin:
            raise HTTPException(status_code=403, detail="Not authorized to access this resource")
