"""Streaming chat and agent endpoints."""

from __future__ import annotations

import json
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sse_starlette.sse import EventSourceResponse

from core.auth import get_current_user
from core.db import User, get_db
from services import chat_service
from services.settings_service import get_llm_settings
from src.agent.loop import agent_stream
from src.llm.client import LLMClient

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatRequest(BaseModel):
    session_id: int
    message: str
    agent_mode: bool = False


@router.post("/stream")
async def chat_stream(
    body: ChatRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    session = chat_service.get_session(db, user, body.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    chat_service.add_message(db, session, "user", body.message)
    history = chat_service.get_messages(db, session)
    messages = [{"role": m.role, "content": m.content} for m in history]

    cfg = get_llm_settings(db)
    model = session.model or cfg.get("model", "llama3.2")
    provider = session.provider or cfg.get("provider", "ollama")
    client = LLMClient(
        base_url=cfg.get("base_url", "http://127.0.0.1:11434"),
        model=model,
        api_key=cfg.get("api_key", ""),
        provider=provider,
    )

    async def event_generator():
        assistant_parts: list[str] = []
        try:
            if body.agent_mode:
                async for event in agent_stream(client, messages):
                    etype = event.get("type", "")
                    if etype == "token":
                        assistant_parts.append(event.get("content", ""))
                    yield {"event": etype or "message", "data": json.dumps(event)}
            else:
                async for token in client.chat_stream(messages):
                    assistant_parts.append(token)
                    yield {"event": "token", "data": json.dumps({"type": "token", "content": token})}
                yield {"event": "done", "data": json.dumps({"type": "done"})}

            full = "".join(assistant_parts)
            if full:
                chat_service.add_message(db, session, "assistant", full)
        except Exception as e:
            yield {"event": "error", "data": json.dumps({"type": "error", "content": str(e)})}

    return EventSourceResponse(event_generator(), sep="\n")
