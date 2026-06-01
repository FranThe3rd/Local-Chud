"""Tasks / todos."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from core.db import Task, User


def list_tasks(db: Session, user: User) -> list[Task]:
    return (
        db.query(Task)
        .filter(Task.user_id == user.id)
        .order_by(Task.done.asc(), Task.created_at.desc())
        .all()
    )


def create_task(db: Session, user: User, title: str) -> Task:
    task = Task(user_id=user.id, title=title)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def toggle_task(db: Session, task: Task, done: bool | None = None) -> Task:
    task.done = done if done is not None else not task.done
    db.commit()
    db.refresh(task)
    return task


def delete_task(db: Session, task: Task) -> None:
    db.delete(task)
    db.commit()
