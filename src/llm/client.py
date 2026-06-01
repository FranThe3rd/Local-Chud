"""OpenAI-compatible chat client for Ollama, vLLM, OpenAI, etc."""

from __future__ import annotations

import json
from typing import Any, AsyncIterator

import httpx


class LLMClient:
    def __init__(
        self,
        base_url: str,
        model: str,
        api_key: str = "",
        provider: str = "ollama",
    ):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.api_key = api_key
        self.provider = provider

    def _headers(self) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    def _chat_url(self) -> str:
        if self.provider == "ollama":
            return f"{self.base_url}/api/chat"
        return f"{self.base_url}/v1/chat/completions"

    def _build_payload(
        self,
        messages: list[dict[str, str]],
        stream: bool,
        temperature: float | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {"model": self.model, "messages": messages, "stream": stream}
        if temperature is not None:
            if self.provider == "ollama":
                payload["options"] = {"temperature": temperature}
            else:
                payload["temperature"] = temperature
        return payload

    async def list_models(self) -> list[str]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            if self.provider == "ollama":
                r = await client.get(f"{self.base_url}/api/tags")
                r.raise_for_status()
                data = r.json()
                return [m.get("name", m.get("model", "")) for m in data.get("models", [])]
            r = await client.get(
                f"{self.base_url}/v1/models",
                headers=self._headers(),
            )
            r.raise_for_status()
            data = r.json()
            return [m.get("id", "") for m in data.get("data", [])]

    async def chat_stream(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float | None = 0.65,
    ) -> AsyncIterator[str]:
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                self._chat_url(),
                headers=self._headers(),
                json=self._build_payload(messages, stream=True, temperature=temperature),
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line:
                        continue
                    if line.startswith("data: "):
                        line = line[6:]
                    if line.strip() == "[DONE]":
                        break
                    try:
                        chunk = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    delta = self._extract_delta(chunk)
                    if delta:
                        yield delta

    def _extract_delta(self, chunk: dict[str, Any]) -> str:
        if self.provider == "ollama":
            msg = chunk.get("message", {})
            return msg.get("content", "") or ""
        choices = chunk.get("choices", [])
        if not choices:
            return ""
        delta = choices[0].get("delta", {})
        return delta.get("content", "") or ""

    async def chat_complete(self, messages: list[dict[str, str]]) -> str:
        parts: list[str] = []
        async for piece in self.chat_stream(messages):
            parts.append(piece)
        return "".join(parts)
