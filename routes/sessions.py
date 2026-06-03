"""Chat session CRUD."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.auth import get_current_user
from core.db import User, get_db
from services import chat_service

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


class SessionCreate(BaseModel):
    title: str = "New chat"
    model: str = ""
    provider: str = ""


class SessionOut(BaseModel):
    id: int
    title: str
    model: str
    provider: str

    class Config:
        from_attributes = True


class MessageOut(BaseModel):
    id: int
    role: str
    content: str

    class Config:
        from_attributes = True


@router.get("")
def list_sessions(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    sessions = chat_service.list_sessions(db, user)
    return [SessionOut.model_validate(s) for s in sessions]


@router.post("")
def create_session(
    body: SessionCreate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    s = chat_service.create_session(db, user, body.title, body.model, body.provider)
    return SessionOut.model_validate(s)


@router.delete("")
def delete_all_sessions(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    deleted = chat_service.delete_all_sessions(db, user)
    return {"ok": True, "deleted": deleted}


@router.get("/{session_id}")
def get_session(
    session_id: int,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    s = chat_service.get_session(db, user, session_id)
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    messages = chat_service.get_messages(db, s)
    return {
        "session": SessionOut.model_validate(s),
        "messages": [MessageOut.model_validate(m) for m in messages],
    }


@router.delete("/{session_id}")
def delete_session(
    session_id: int,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    s = chat_service.get_session(db, user, session_id)
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    if chat_service.is_protected_session(s):
        raise HTTPException(status_code=400, detail="New chat cannot be deleted")
    chat_service.delete_session(db, user, session_id)
    return {"ok": True}
