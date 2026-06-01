"""Web search via SearXNG (optional Docker service)."""

from __future__ import annotations

from typing import Any

import httpx

from core.config import get_settings


async def web_search(query: str, limit: int = 8) -> dict[str, Any]:
    settings = get_settings()
    base = settings.searxng_url.rstrip("/")
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get(
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
                        "snippet": item.get("content") or item.get("snippet", ""),
                    }
                )
            return {"ok": True, "query": query, "results": results, "engine": "searxng"}
    except Exception as e:
        return {
            "ok": False,
            "query": query,
            "results": [],
            "error": str(e),
            "hint": "Start SearXNG with docker compose, or ignore for local-only chat.",
        }
