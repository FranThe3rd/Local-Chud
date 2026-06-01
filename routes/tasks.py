"""Tasks API."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.auth import get_current_user
from core.db import User, get_db
from services import task_service

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


class TaskOut(BaseModel):
    id: int
    title: str
    done: bool

    class Config:
        from_attributes = True


class TaskCreate(BaseModel):
    title: str


class TaskPatch(BaseModel):
    done: bool | None = None


@router.get("")
def list_tasks(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    tasks = task_service.list_tasks(db, user)
    return [TaskOut.model_validate(t) for t in tasks]


@router.post("")
def create_task(
    body: TaskCreate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    task = task_service.create_task(db, user, body.title)
    return TaskOut.model_validate(task)


@router.patch("/{task_id}")
def patch_task(
    task_id: int,
    body: TaskPatch,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    from core.db import Task

    task = db.query(Task).filter(Task.id == task_id, Task.user_id == user.id).first()
    if not task:
        raise HTTPException(404, "Task not found")
    task = task_service.toggle_task(db, task, body.done)
    return TaskOut.model_validate(task)


@router.delete("/{task_id}")
def delete_task_route(
    task_id: int,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    from core.db import Task

    task = db.query(Task).filter(Task.id == task_id, Task.user_id == user.id).first()
    if not task:
        raise HTTPException(404, "Task not found")
    task_service.delete_task(db, task)
    return {"ok": True}
