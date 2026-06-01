"""Authentication routes."""

from __future__ import annotations

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.auth import (
    SESSION_COOKIE,
    create_session,
    destroy_session,
    get_current_user,
    get_current_user_optional,
    set_session_cookie,
    verify_password,
)
from core.config import get_settings
from core.db import User, get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    is_admin: bool

    class Config:
        from_attributes = True


@router.post("/login")
def login(
    body: LoginRequest,
    response: Response,
    db: Annotated[Session, Depends(get_db)],
):
    user = db.query(User).filter(User.username == body.username).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_session(user.id)
    set_session_cookie(response, token)
    return {"ok": True, "user": UserResponse.model_validate(user)}


@router.post("/logout")
def logout(request: Request, response: Response):
    token = request.cookies.get(SESSION_COOKIE)
    if token:
        destroy_session(token)
    response.delete_cookie(SESSION_COOKIE, path="/")
    return {"ok": True}


@router.get("/me")
def me(user: Annotated[User, Depends(get_current_user)]):
    return UserResponse.model_validate(user)


@router.get("/check")
def check(user: Annotated[Optional[User], Depends(get_current_user_optional)]):
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return UserResponse.model_validate(user)
