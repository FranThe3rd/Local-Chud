"""Session-based authentication."""

from __future__ import annotations

import secrets
from typing import Annotated, Optional

import bcrypt
from fastapi import Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from core.config import get_settings
from core.db import User, get_db

SESSION_COOKIE = "lc_session"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


def generate_temp_password(length: int = 16) -> str:
    return secrets.token_urlsafe(length)[:length]


_sessions: dict[str, int] = {}


def set_session_cookie(response: Response, token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        httponly=True,
        samesite="lax",
        max_age=settings.session_max_age,
        path="/",
    )


def is_local_request(request: Request) -> bool:
    if not request.client:
        return False
    host = request.client.host or ""
    return host in ("127.0.0.1", "::1", "localhost")


def auto_login_enabled(request: Request) -> bool:
    settings = get_settings()
    return settings.auth_enabled and settings.auto_login and is_local_request(request)


def login_admin_user(db: Session) -> str | None:
    """Create session token for admin. Returns None if admin missing."""
    user = db.query(User).filter(User.username == "admin").first()
    if not user:
        return None
    return create_session(user.id)


def create_session(user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    _sessions[token] = user_id
    return token


def destroy_session(token: str) -> None:
    _sessions.pop(token, None)


def get_user_id_from_token(token: Optional[str]) -> Optional[int]:
    if not token:
        return None
    return _sessions.get(token)


def get_current_user_optional(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
) -> Optional[User]:
    settings = get_settings()
    if not settings.auth_enabled:
        user = db.query(User).filter(User.username == "admin").first()
        if user:
            return user
        return None

    token = request.cookies.get(SESSION_COOKIE)
    user_id = get_user_id_from_token(token)
    if not user_id:
        return None
    return db.query(User).filter(User.id == user_id).first()


def get_current_user(
    user: Annotated[Optional[User], Depends(get_current_user_optional)],
) -> User:
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return user


def require_admin(user: Annotated[User, Depends(get_current_user)]) -> User:
    if not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin required")
    return user
