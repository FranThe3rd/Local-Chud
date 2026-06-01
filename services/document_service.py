"""Document CRUD."""

from __future__ import annotations

from sqlalchemy.orm import Session

from core.db import Document, User


def list_documents(db: Session, user: User) -> list[Document]:
    return (
        db.query(Document)
        .filter(Document.user_id == user.id)
        .order_by(Document.updated_at.desc())
        .all()
    )


def get_document(db: Session, user: User, doc_id: int) -> Document | None:
    return (
        db.query(Document)
        .filter(Document.id == doc_id, Document.user_id == user.id)
        .first()
    )


def create_document(
    db: Session,
    user: User,
    title: str = "Untitled",
    content: str = "",
    doc_type: str = "markdown",
) -> Document:
    doc = Document(user_id=user.id, title=title, content=content, doc_type=doc_type)
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


def update_document(
    db: Session,
    doc: Document,
    title: str | None = None,
    content: str | None = None,
) -> Document:
    if title is not None:
        doc.title = title
    if content is not None:
        doc.content = content
    db.commit()
    db.refresh(doc)
    return doc


def delete_document(db: Session, doc: Document) -> None:
    db.delete(doc)
    db.commit()
