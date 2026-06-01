"""Document editor API."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.auth import get_current_user
from core.db import User, get_db
from services import document_service

router = APIRouter(prefix="/api/documents", tags=["documents"])


class DocumentOut(BaseModel):
    id: int
    title: str
    content: str
    doc_type: str

    class Config:
        from_attributes = True


class DocumentCreate(BaseModel):
    title: str = "Untitled"
    content: str = ""
    doc_type: str = "markdown"


class DocumentUpdate(BaseModel):
    title: str | None = None
    content: str | None = None


@router.get("")
def list_docs(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    docs = document_service.list_documents(db, user)
    return [DocumentOut.model_validate(d) for d in docs]


@router.post("")
def create_doc(
    body: DocumentCreate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    doc = document_service.create_document(db, user, body.title, body.content, body.doc_type)
    return DocumentOut.model_validate(doc)


@router.get("/{doc_id}")
def get_doc(
    doc_id: int,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    doc = document_service.get_document(db, user, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    return DocumentOut.model_validate(doc)


@router.put("/{doc_id}")
def update_doc(
    doc_id: int,
    body: DocumentUpdate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    doc = document_service.get_document(db, user, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    doc = document_service.update_document(db, doc, body.title, body.content)
    return DocumentOut.model_validate(doc)


@router.delete("/{doc_id}")
def delete_doc(
    doc_id: int,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    doc = document_service.get_document(db, user, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    document_service.delete_document(db, doc)
    return {"ok": True}
