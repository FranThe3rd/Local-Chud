"""User bootstrap and management."""

from __future__ import annotations

from sqlalchemy.orm import Session

from core.auth import generate_temp_password, hash_password
from core.db import User


def ensure_admin_user(db: Session) -> str | None:
    """Create admin on first boot. Returns temp password if newly created."""
    existing = db.query(User).filter(User.username == "admin").first()
    if existing:
        return None

    temp = generate_temp_password()
    admin = User(
        username="admin",
        password_hash=hash_password(temp),
        is_admin=True,
    )
    db.add(admin)
    db.commit()
    return temp
