"""Agent loop: tool calls in model output, execute, continue."""

from __future__ import annotations

import json
import re
from typing import Any, AsyncIterator

from sqlalchemy.orm import Session

from core.db import User
from src.agent.prompts import build_agent_system
from src.agent.tools import TOOL_DEFINITIONS, run_tool
from src.llm.client import LLMClient

TOOL_CALL_PATTERN = re.compile(
    r"<tool_call>\s*(\{.*?\})\s*</tool_call>",
    re.DOTALL,
)


def _tool_catalog() -> list[str]:
    return [f"{t['name']}: {t['description']}" for t in TOOL_DEFINITIONS]


async def agent_stream(
    client: LLMClient,
    messages: list[dict[str, str]],
    *,
    db: Session,
    user: User,
    max_rounds: int = 6,
) -> AsyncIterator[dict[str, Any]]:
    system = build_agent_system(_tool_catalog())
    working = [{"role": "system", "content": system}] + list(messages)
    full_reply = ""

    for _round_idx in range(max_rounds):
        round_text = ""
        async for token in client.chat_stream(working, temperature=0.35):
            round_text += token
            full_reply += token
            yield {"type": "token", "content": token}

        match = TOOL_CALL_PATTERN.search(round_text)
        if not match:
            yield {"type": "done", "content": full_reply}
            return

        try:
            call = json.loads(match.group(1))
        except json.JSONDecodeError:
            yield {"type": "error", "content": "Invalid tool_call JSON"}
            yield {"type": "done", "content": full_reply}
            return

        name = call.get("name", "")
        args = call.get("arguments", {}) or {}
        yield {"type": "tool_start", "name": name, "arguments": args}
        result = run_tool(name, args, db=db, user=user)
        yield {"type": "tool_result", "name": name, "result": result}

        working.append({"role": "assistant", "content": round_text})
        working.append(
            {
                "role": "user",
                "content": f'<tool_result name="{name}">\n{json.dumps(result, indent=2)}\n</tool_result>',
            }
        )

    yield {"type": "error", "content": "Agent reached max tool rounds"}
    yield {"type": "done", "content": full_reply}
