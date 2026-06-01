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


def maybe_autotitle_session(
    db: Session,
    session: ChatSession,
    user_message: str,
    assistant_message: str,
    max_len: int = 48,
) -> None:
    """Derive a short session title from the first exchange."""
    source = (user_message or "").strip().replace("\n", " ")
    if not source:
        source = (assistant_message or "").strip().replace("\n", " ")
    if not source:
        return
    title = source[:max_len].strip()
    if len(source) > max_len:
        title = title.rsplit(" ", 1)[0] + "…" if " " in title else title + "…"
    session.title = title or session.title
    db.commit()


def delete_all_sessions(db: Session, user: User) -> int:
    sessions = list_sessions(db, user)
    if not sessions:
        return 0
    for s in sessions:
        s.parent_id = None
    db.flush()
    for s in sessions:
        db.delete(s)
    db.commit()
    return len(sessions)
