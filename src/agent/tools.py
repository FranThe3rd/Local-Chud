"""Agent tools — workspace, web, documents, memory."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import httpx
from sqlalchemy.orm import Session

from core.config import get_settings
from core.db import User
from services import document_service, memory_service

WORKSPACE = Path(__file__).resolve().parent.parent.parent


def _safe_path(path: str) -> Path:
    base = WORKSPACE.resolve()
    resolved = (base / path).resolve()
    if not str(resolved).startswith(str(base)):
        raise PermissionError("Path escapes workspace")
    return resolved


def tool_read_file(path: str, max_bytes: int = 64_000) -> dict[str, Any]:
    target = _safe_path(path)
    if not target.exists():
        return {"ok": False, "error": f"File not found: {path}"}
    if not target.is_file():
        return {"ok": False, "error": f"Not a file: {path}"}
    size = target.stat().st_size
    if size > max_bytes:
        content = target.read_text(encoding="utf-8", errors="replace")[:max_bytes]
        truncated = True
    else:
        content = target.read_text(encoding="utf-8", errors="replace")
        truncated = False
    try:
        rel = str(target.relative_to(WORKSPACE))
    except ValueError:
        rel = path
    return {
        "ok": True,
        "path": rel,
        "content": content,
        "truncated": truncated,
        "size": size,
    }


def tool_web_search(query: str, limit: int = 5) -> dict[str, Any]:
    settings = get_settings()
    base = settings.searxng_url.rstrip("/")
    try:
        with httpx.Client(timeout=15.0) as client:
            r = client.get(
                f"{base}/search",
                params={"q": query, "format": "json", "language": "en"},
            )
            r.raise_for_status()
            data = r.json()
            results = []
            for item in (data.get("results") or [])[:limit]:
                results.append(
                    {
                        "title": item.get("title", ""),
                        "url": item.get("url", ""),
                        "snippet": (item.get("content") or item.get("snippet", ""))[:300],
                    }
                )
            return {"ok": True, "query": query, "results": results}
    except Exception as e:
        return {"ok": False, "error": str(e), "hint": "Start SearXNG (docker compose) for web search."}


def tool_save_document(
    db: Session,
    user: User,
    title: str,
    content: str,
) -> dict[str, Any]:
    title = (title or "Untitled").strip()[:256]
    content = content or ""
    if not content.strip():
        return {"ok": False, "error": "content is empty"}
    doc = document_service.create_document(db, user, title, content, "markdown")
    return {"ok": True, "id": doc.id, "title": doc.title}


def tool_list_memories(user_id: int, limit: int = 20) -> dict[str, Any]:
    items = memory_service.list_memories(user_id)[:limit]
    return {
        "ok": True,
        "memories": [{"id": m.get("id"), "content": m.get("content"), "tags": m.get("tags", [])} for m in items],
    }


def tool_list_documents(db: Session, user: User, limit: int = 20) -> dict[str, Any]:
    docs = document_service.list_documents(db, user)[:limit]
    return {
        "ok": True,
        "documents": [{"id": d.id, "title": d.title, "updated_at": str(d.updated_at)} for d in docs],
    }


TOOL_DEFINITIONS = [
    {
        "name": "read_file",
        "description": "Read a text file from the workspace (path relative to project root).",
        "parameters": {
            "type": "object",
            "properties": {"path": {"type": "string", "description": "Relative file path"}},
            "required": ["path"],
        },
    },
    {
        "name": "web_search",
        "description": "Search the web via SearXNG for current info, docs, or facts.",
        "parameters": {
            "type": "object",
            "properties": {"query": {"type": "string", "description": "Search query"}},
            "required": ["query"],
        },
    },
    {
        "name": "save_document",
        "description": "Save markdown to the user's Documents library.",
        "parameters": {
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Document title"},
                "content": {"type": "string", "description": "Full markdown body"},
            },
            "required": ["title", "content"],
        },
    },
    {
        "name": "list_memories",
        "description": "List facts stored about the user (preferences, context).",
        "parameters": {"type": "object", "properties": {}},
    },
    {
        "name": "list_documents",
        "description": "List the user's saved documents (title and id).",
        "parameters": {"type": "object", "properties": {}},
    },
]


def run_tool(
    name: str,
    arguments: dict[str, Any],
    *,
    db: Session | None = None,
    user: User | None = None,
) -> dict[str, Any]:
    try:
        if name == "read_file":
            return tool_read_file(arguments.get("path", ""))
        if name == "web_search":
            return tool_web_search(arguments.get("query", ""))
        if name == "save_document":
            if not db or not user:
                return {"ok": False, "error": "save_document requires auth context"}
            return tool_save_document(
                db,
                user,
                arguments.get("title", "Untitled"),
                arguments.get("content", ""),
            )
        if name == "list_memories":
            if not user:
                return {"ok": False, "error": "list_memories requires auth context"}
            return tool_list_memories(user.id)
        if name == "list_documents":
            if not db or not user:
                return {"ok": False, "error": "list_documents requires auth context"}
            return tool_list_documents(db, user)
        return {"ok": False, "error": f"Unknown tool: {name}"}
    except PermissionError as e:
        return {"ok": False, "error": str(e)}
    except OSError as e:
        return {"ok": False, "error": str(e)}
