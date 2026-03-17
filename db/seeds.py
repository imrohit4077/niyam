"""
Database seeding. Rails equivalent: db/seeds.rb
Creates: 1 account, 1 admin role, 1 user, links them together.
"""

import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def run_seeds() -> None:
    from config.database import SessionLocal
    from app.models.user import User
    from app.models.account import Account
    from app.models.account_user import AccountUser
    from app.models.role import Role
    from app.models.account_user_role import AccountUserRole

    db = SessionLocal()
    try:
        # Skip if already seeded
        if User.find_by(db, email="admin@example.com"):
            print("Seeds: already seeded, skipping.")
            return

        now = datetime.now(timezone.utc)

        # 1. Account (tenant)
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

        # 2. Role
        role = Role(
            account_id=account.id,
            name="Admin",
            slug="admin",
            description="Full access",
            created_at=now,
        )
        db.add(role)
        db.flush()

        # 3. User
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

        # 4. AccountUser (membership)
        au = AccountUser(
            account_id=account.id,
            user_id=user.id,
            status="active",
            joined_at=now,
            created_at=now,
        )
        db.add(au)
        db.flush()

        # 5. AccountUserRole (RBAC)
        aur = AccountUserRole(account_user_id=au.id, role_id=role.id)
        db.add(aur)
        db.commit()

        print(f"Seeds: created account '{account.name}', user '{user.email}' with role '{role.name}'")
        print("Login: admin@example.com / password123")
    finally:
        db.close()
