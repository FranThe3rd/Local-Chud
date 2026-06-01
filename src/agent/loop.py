"""Simple agent loop: detect tool calls in model output and execute."""

from __future__ import annotations

import json
import re
from typing import Any, AsyncIterator

from src.agent.tools import TOOL_DEFINITIONS, run_tool
from src.llm.client import LLMClient

TOOL_CALL_PATTERN = re.compile(
    r"<tool_call>\s*(\{.*?\})\s*</tool_call>",
    re.DOTALL,
)

SYSTEM_AGENT = """You are local chud agent. You can use tools by emitting:
<tool_call>{"name": "read_file", "arguments": {"path": "README.md"}}</tool_call>

Available tools:
""" + json.dumps([t["name"] + ": " + t["description"] for t in TOOL_DEFINITIONS])


async def agent_stream(
    client: LLMClient,
    messages: list[dict[str, str]],
    max_rounds: int = 3,
) -> AsyncIterator[dict[str, Any]]:
    """Stream agent events: token, tool_start, tool_result, done."""
    working = [{"role": "system", "content": SYSTEM_AGENT}] + list(messages)
    full_reply = ""

    for round_idx in range(max_rounds):
        round_text = ""
        async for token in client.chat_stream(working):
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
        args = call.get("arguments", {})
        yield {"type": "tool_start", "name": name, "arguments": args}
        result = run_tool(name, args)
        yield {"type": "tool_result", "name": name, "result": result}

        working.append({"role": "assistant", "content": round_text})
        working.append(
            {
                "role": "user",
                "content": f"<tool_result name=\"{name}\">\n{json.dumps(result, indent=2)}\n</tool_result>",
            }
        )

    yield {"type": "done", "content": full_reply}
