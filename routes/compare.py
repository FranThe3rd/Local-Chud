"""Side-by-side model compare."""

from __future__ import annotations

import asyncio
import time
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.auth import get_current_user
from core.db import User, get_db
from services.settings_service import get_llm_settings
from src.llm.client import LLMClient

router = APIRouter(prefix="/api/compare", tags=["compare"])


class CompareRequest(BaseModel):
    prompt: str
    model_a: str | None = None
    model_b: str | None = None


class SingleRequest(BaseModel):
    prompt: str
    model: str | None = None


async def _run_one(cfg: dict, model: str, prompt: str) -> dict:
    client = LLMClient(
        cfg.get("base_url", "http://127.0.0.1:11434"),
        model,
        cfg.get("api_key", ""),
        cfg.get("provider", "ollama"),
    )
    messages = [{"role": "user", "content": prompt}]
    start = time.perf_counter()
    try:
        text = await client.chat_complete(messages)
        elapsed = time.perf_counter() - start
        words = len(text.split())
        return {
            "model": model,
            "ok": True,
            "content": text,
            "elapsed_ms": round(elapsed * 1000),
            "chars": len(text),
            "words": words,
            "words_per_sec": round(words / elapsed, 1) if elapsed > 0 else 0,
        }
    except Exception as e:
        return {
            "model": model,
            "ok": False,
            "error": str(e),
            "elapsed_ms": round((time.perf_counter() - start) * 1000),
        }


@router.post("/single")
async def compare_single(
    body: SingleRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    cfg = get_llm_settings(db)
    model = body.model or cfg.get("model", "llama3.2:latest")
    return await _run_one(cfg, model, body.prompt)


@router.post("/run")
async def compare_run(
    body: CompareRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    cfg = get_llm_settings(db)
    model_a = body.model_a or cfg.get("model", "llama3.2:latest")
    model_b = body.model_b or model_a

    # Run sequentially: a single Ollama instance can stall when forced to load
    # two different models concurrently.
    a = await _run_one(cfg, model_a, body.prompt)
    b = await _run_one(cfg, model_b, body.prompt)
    return {"prompt": body.prompt, "a": a, "b": b}


@router.get("")
def compare_info(user: Annotated[User, Depends(get_current_user)]):
    return {"status": "ready", "endpoint": "POST /api/compare/run"}
