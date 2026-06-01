"""Side-by-side model compare."""

from __future__ import annotations

import asyncio
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


@router.post("/run")
async def compare_run(
    body: CompareRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    cfg = get_llm_settings(db)
    base = cfg.get("base_url", "http://127.0.0.1:11434")
    provider = cfg.get("provider", "ollama")
    model_a = body.model_a or cfg.get("model", "llama3.2:latest")
    model_b = body.model_b or model_a
    messages = [{"role": "user", "content": body.prompt}]

    async def run_one(model: str) -> dict:
        client = LLMClient(base, model, cfg.get("api_key", ""), provider)
        try:
            text = await client.chat_complete(messages)
            return {"model": model, "ok": True, "content": text}
        except Exception as e:
            return {"model": model, "ok": False, "error": str(e)}

    a, b = await asyncio.gather(run_one(model_a), run_one(model_b))
    return {"prompt": body.prompt, "a": a, "b": b}


@router.get("")
def compare_info(user: Annotated[User, Depends(get_current_user)]):
    return {"status": "ready", "endpoint": "POST /api/compare/run"}
