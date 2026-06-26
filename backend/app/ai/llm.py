"""llm.py — swappable LLM client for the analyst agent.

The agent talks to a model only through ``LLMClient.chat(messages, tools)``,
which returns either assistant content or a list of tool calls. The default
implementation calls a local Ollama server (qwen2.5:3b) over its ``/api/chat``
endpoint; tests inject a deterministic fake via the ``get_llm`` dependency, so
the build never depends on a running model. Swapping Ollama for a hosted
tool-calling API is a single new ``LLMClient`` — nothing else in the agent
changes.
"""

import uuid
from dataclasses import dataclass, field
from typing import Protocol, runtime_checkable

import httpx

from app.config import settings


@dataclass
class ToolCall:
    name: str
    arguments: dict
    id: str = field(default_factory=lambda: uuid.uuid4().hex)


@dataclass
class LLMReply:
    content: str | None = None
    tool_calls: list[ToolCall] = field(default_factory=list)


@runtime_checkable
class LLMClient(Protocol):
    async def chat(self, messages: list[dict], tools: list[dict]) -> LLMReply: ...


class OllamaClient:
    """Calls a local Ollama server's /api/chat with native tool calling."""

    def __init__(
        self,
        *,
        model: str | None = None,
        base_url: str | None = None,
        timeout: float | None = None,
    ):
        self.model = model or settings.OLLAMA_MODEL
        self.base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/")
        self.timeout = timeout or settings.AGENT_TIMEOUT_SECONDS

    async def chat(self, messages: list[dict], tools: list[dict]) -> LLMReply:
        payload: dict = {"model": self.model, "messages": messages, "stream": False}
        if tools:
            payload["tools"] = tools
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(f"{self.base_url}/api/chat", json=payload)
            resp.raise_for_status()
        message = resp.json().get("message", {}) or {}
        tool_calls = [
            ToolCall(
                name=tc["function"]["name"],
                arguments=tc["function"].get("arguments") or {},
            )
            for tc in (message.get("tool_calls") or [])
        ]
        return LLMReply(content=message.get("content") or None, tool_calls=tool_calls)


def get_llm() -> LLMClient:
    """FastAPI dependency — the live client. Overridden with a fake in tests."""
    return OllamaClient()
