"""Settings and model discovery routes."""

from __future__ import annotations

import json
import logging
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sse_starlette.sse import EventSourceResponse

from core.auth import get_current_user
from core.db import User, get_db
from services.settings_service import get_llm_settings, save_llm_settings
from src.llm.client import LLMClient

logger = logging.getLogger("localllm")

router = APIRouter(prefix="/api/settings", tags=["settings"])


class LLMSettingsBody(BaseModel):
    provider: str | None = None
    model: str | None = None
    base_url: str | None = None
    api_key: str | None = None
    openai_compatible: bool | None = None


class PullModelBody(BaseModel):
    model: str


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


@router.post("/pull")
async def pull_model(
    body: PullModelBody,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    name = body.model.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Model name is required")

    cfg = get_llm_settings(db)
    if cfg.get("provider") != "ollama":
        raise HTTPException(status_code=400, detail="Model download is only supported for Ollama.")

    client = LLMClient(
        base_url=cfg.get("base_url", "http://127.0.0.1:11434"),
        model=name,
        provider="ollama",
    )

    async def event_generator():
        logger.info("Ollama pull started: %s", name)
        last_logged = -1
        try:
            async for event in client.pull_model(name):
                status = event.get("status", "")
                total = event.get("total") or 0
                completed = event.get("completed") or 0
                percent = round(completed / total * 100) if total else None

                if percent is not None and percent != last_logged and percent % 10 == 0:
                    last_logged = percent
                    logger.info("Ollama pull %s: %s%% (%s)", name, percent, status)

                if event.get("error"):
                    logger.error("Ollama pull %s failed: %s", name, event["error"])
                    yield {"event": "error", "data": json.dumps({"error": event["error"]})}
                    return

                yield {
                    "event": "progress",
                    "data": json.dumps(
                        {
                            "status": status,
                            "completed": completed,
                            "total": total,
                            "percent": percent,
                        }
                    ),
                }
            logger.info("Ollama pull complete: %s", name)
            yield {"event": "done", "data": json.dumps({"model": name})}
        except Exception as e:
            logger.error("Ollama pull %s error: %s", name, e)
            yield {
                "event": "error",
                "data": json.dumps(
                    {"error": str(e), "hint": "Is Ollama running? Check the base URL."}
                ),
            }

    return EventSourceResponse(event_generator(), sep="\n")


@router.post("/delete-model")
async def delete_model(
    body: PullModelBody,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    name = body.model.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Model name is required")

    cfg = get_llm_settings(db)
    if cfg.get("provider") != "ollama":
        raise HTTPException(status_code=400, detail="Model removal is only supported for Ollama.")

    client = LLMClient(
        base_url=cfg.get("base_url", "http://127.0.0.1:11434"),
        model=name,
        provider="ollama",
    )
    try:
        await client.delete_model(name)
        logger.info("Ollama model removed: %s", name)
    except Exception as e:
        logger.error("Ollama delete %s failed: %s", name, e)
        raise HTTPException(status_code=502, detail=f"Could not remove model: {e}")

    if cfg.get("model") == name:
        save_llm_settings(db, {"model": ""})

    return {"ok": True, "removed": name}
