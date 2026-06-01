"""Agent tools — MVP: read_file."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import httpx

from core.config import get_settings

WORKSPACE = Path(__file__).resolve().parent.parent.parent


def _safe_path(path: str) -> Path:
    """Resolve path within project workspace; block traversal."""
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


TOOL_DEFINITIONS = [
    {
        "name": "read_file",
        "description": "Read a text file from the workspace. Path is relative to project root.",
        "parameters": {
            "type": "object",
            "properties": {"path": {"type": "string", "description": "Relative file path"}},
            "required": ["path"],
        },
    },
    {
        "name": "web_search",
        "description": "Search the web via SearXNG. Returns titles, URLs, snippets.",
        "parameters": {
            "type": "object",
            "properties": {"query": {"type": "string", "description": "Search query"}},
            "required": ["query"],
        },
    },
]


def run_tool(name: str, arguments: dict[str, Any]) -> dict[str, Any]:
    try:
        if name == "read_file":
            return tool_read_file(arguments.get("path", ""))
        if name == "web_search":
            return tool_web_search(arguments.get("query", ""))
        return {"ok": False, "error": f"Unknown tool: {name}"}
    except PermissionError as e:
        return {"ok": False, "error": str(e)}
    except OSError as e:
        return {"ok": False, "error": str(e)}
