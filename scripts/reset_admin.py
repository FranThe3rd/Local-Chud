#!/usr/bin/env python3
"""Reset admin password and print new temp credentials."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from core.auth import generate_temp_password, hash_password
from core.db import User, get_session_factory, init_db


def main() -> int:
    init_db()
    db = get_session_factory()()
    temp = generate_temp_password()
    user = db.query(User).filter(User.username == "admin").first()
    if not user:
        user = User(username="admin", password_hash=hash_password(temp), is_admin=True)
        db.add(user)
    else:
        user.password_hash = hash_password(temp)
    db.commit()
    db.close()
    print("LocalLLM — admin reset")
    print(f"   Username: admin")
    print(f"   Password: {temp}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
