"""Settings and model discovery routes."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.auth import get_current_user
from core.db import User, get_db
from services.settings_service import get_llm_settings, save_llm_settings
from src.llm.client import LLMClient

router = APIRouter(prefix="/api/settings", tags=["settings"])


class LLMSettingsBody(BaseModel):
    provider: str | None = None
    model: str | None = None
    base_url: str | None = None
    api_key: str | None = None
    openai_compatible: bool | None = None


@router.get("/llm")
def get_settings_llm(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    data = get_llm_settings(db)
    # Never expose full API key to client
    if data.get("api_key"):
        data["api_key_set"] = True
        data["api_key"] = ""
    else:
        data["api_key_set"] = False
    return data


@router.put("/llm")
def put_settings_llm(
    body: LLMSettingsBody,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    payload = body.model_dump(exclude_unset=True)
    current = get_llm_settings(db)
    if payload.get("api_key") == "" and current.get("api_key"):
        payload.pop("api_key", None)
    saved = save_llm_settings(db, payload)
    if saved.get("api_key"):
        saved["api_key_set"] = True
        saved["api_key"] = ""
    else:
        saved["api_key_set"] = False
    return saved


@router.get("/models")
async def list_models(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    cfg = get_llm_settings(db)
    client = LLMClient(
        base_url=cfg.get("base_url", "http://127.0.0.1:11434"),
        model=cfg.get("model", "llama3.2"),
        api_key=cfg.get("api_key", ""),
        provider=cfg.get("provider", "ollama"),
    )
    try:
        models = await client.list_models()
        return {"models": models, "provider": cfg.get("provider"), "reachable": True}
    except Exception as e:
        # 200 + reachable:false — Ollama often not running yet; avoids noisy 502 in DevTools
        return {
            "models": [cfg.get("model", "llama3.2")],
            "provider": cfg.get("provider"),
            "reachable": False,
            "error": str(e),
        }
