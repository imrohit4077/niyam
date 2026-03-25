"""
Resolve primary JWT/profile role when a user has multiple account roles.
"""

# Lower index = higher privilege (first match wins for min()).
_ROLE_PRIORITY: tuple[str, ...] = ("superadmin", "admin", "member")


def highest_role_slug(slugs: list[str]) -> str:
    if not slugs:
        return "member"

    def rank(s: str) -> int:
        try:
            return _ROLE_PRIORITY.index(s)
        except ValueError:
            return len(_ROLE_PRIORITY) + 1

    return min(slugs, key=rank)
