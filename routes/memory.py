"""Memory & skills API."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core.auth import get_current_user
from core.db import User
from services import memory_service

router = APIRouter(prefix="/api/memory", tags=["memory"])


class MemoryCreate(BaseModel):
    content: str
    tags: list[str] = []


@router.get("")
def list_memory(user: Annotated[User, Depends(get_current_user)]):
    return {"memories": memory_service.list_memories(user.id)}


@router.post("")
def add_memory(
    body: MemoryCreate,
    user: Annotated[User, Depends(get_current_user)],
):
    if not body.content.strip():
        raise HTTPException(400, "Content required")
    item = memory_service.add_memory(user.id, body.content, body.tags)
    return item


@router.delete("/{memory_id}")
def remove_memory(
    memory_id: str,
    user: Annotated[User, Depends(get_current_user)],
):
    if not memory_service.delete_memory(user.id, memory_id):
        raise HTTPException(404, "Memory not found")
    return {"ok": True}
