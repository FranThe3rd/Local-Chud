"""User memory store (JSON files in data/memory/)."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from core.config import get_settings


def _user_file(user_id: int) -> Path:
    settings = get_settings()
    d = settings.data_dir / "memory"
    d.mkdir(parents=True, exist_ok=True)
    return d / f"user_{user_id}.json"


def _load(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    try:
        data = json.loads(path.read_text())
        return data if isinstance(data, list) else []
    except json.JSONDecodeError:
        return []


def _save(path: Path, items: list[dict[str, Any]]) -> None:
    path.write_text(json.dumps(items, indent=2))


def list_memories(user_id: int) -> list[dict[str, Any]]:
    return _load(_user_file(user_id))


def add_memory(user_id: int, content: str, tags: list[str] | None = None) -> dict[str, Any]:
    path = _user_file(user_id)
    items = _load(path)
    item = {
        "id": str(uuid.uuid4()),
        "content": content.strip(),
        "tags": tags or [],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    items.insert(0, item)
    _save(path, items)
    return item


def delete_memory(user_id: int, memory_id: str) -> bool:
    path = _user_file(user_id)
    items = _load(path)
    new_items = [m for m in items if m.get("id") != memory_id]
    if len(new_items) == len(items):
        return False
    _save(path, new_items)
    return True
