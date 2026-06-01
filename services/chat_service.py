"""Chat session and message persistence."""

from __future__ import annotations

import json
from typing import Any

from sqlalchemy.orm import Session

from core.db import ChatSession, Message, User


def list_sessions(db: Session, user: User) -> list[ChatSession]:
    return (
        db.query(ChatSession)
        .filter(ChatSession.user_id == user.id)
        .order_by(ChatSession.updated_at.desc())
        .all()
    )


def get_session(db: Session, user: User, session_id: int) -> ChatSession | None:
    return (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == user.id)
        .first()
    )


def create_session(
    db: Session,
    user: User,
    title: str = "New chat",
    model: str = "",
    provider: str = "",
    parent_id: int | None = None,
) -> ChatSession:
    session = ChatSession(
        user_id=user.id,
        title=title,
        model=model,
        provider=provider,
        parent_id=parent_id,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def add_message(
    db: Session,
    session: ChatSession,
    role: str,
    content: str,
    meta: dict[str, Any] | None = None,
) -> Message:
    msg = Message(
        session_id=session.id,
        role=role,
        content=content,
        meta=json.dumps(meta or {}),
    )
    db.add(msg)
    session.updated_at = msg.created_at
    db.commit()
    db.refresh(msg)
    return msg


def get_messages(db: Session, session: ChatSession) -> list[Message]:
    return db.query(Message).filter(Message.session_id == session.id).order_by(Message.created_at).all()
