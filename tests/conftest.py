import os
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Use temp data dir before importing app
_tmp = tempfile.mkdtemp()
os.environ["LOCALCHUD_DATA_DIR"] = _tmp
os.environ["AUTH_ENABLED"] = "true"

from app import app  # noqa: E402
from core.db import init_db, get_session_factory
from services.user_service import ensure_admin_user


@pytest.fixture
def client():
    init_db()
    db = get_session_factory()()
    ensure_admin_user(db)
    db.close()
    return TestClient(app)


@pytest.fixture
def auth_client(client):
    # Login with known password by resetting admin — use ensure + manual session
    from core.auth import create_session, hash_password
    from core.db import User

    db = get_session_factory()()
    user = db.query(User).filter(User.username == "admin").first()
    user.password_hash = hash_password("testpass123")
    db.commit()
    db.close()

    r = client.post("/api/auth/login", json={"username": "admin", "password": "testpass123"})
    assert r.status_code == 200
    return client
