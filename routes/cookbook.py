"""Cookbook — model ops & hardware scan."""

from __future__ import annotations

import os
import platform
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.auth import get_current_user
from core.db import User, get_db
from services.hwfit import scan_hardware
from services.settings_service import get_llm_settings
from src.llm.client import LLMClient

router = APIRouter(prefix="/api/cookbook", tags=["cookbook"])


@router.get("/status")
async def cookbook_status(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    cfg = get_llm_settings(db)
    client = LLMClient(
        cfg.get("base_url", "http://127.0.0.1:11434"),
        cfg.get("model", "llama3.2:latest"),
        provider=cfg.get("provider", "ollama"),
    )
    models: list[str] = []
    ollama_ok = False
    try:
        models = await client.list_models()
        ollama_ok = True
    except Exception:
        pass

    return {
        "status": "ready",
        "hardware": scan_hardware(),
        "ollama": {"reachable": ollama_ok, "models": models, "base_url": cfg.get("base_url")},
        "features": {
            "hf_download": "stub — tmux background jobs planned",
            "vllm_serve": "stub",
            "ssh_remote": "stub",
        },
    }
