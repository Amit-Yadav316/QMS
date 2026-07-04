"""llm.py — swappable LLM client for the analyst agent.

The agent talks to a model only through ``LLMClient.chat(messages, tools)``,
which returns either assistant content or a list of tool calls. The default
implementation calls a local Ollama server (qwen2.5:3b) over its ``/api/chat``
endpoint; tests inject a deterministic fake via the ``get_llm`` dependency, so
the build never depends on a running model. Swapping Ollama for a hosted
tool-calling API is a single new ``LLMClient`` — nothing else in the agent
changes.
"""

import json
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


def _to_openai_messages(messages: list[dict]) -> list[dict]:
    """Translate the agent's internal (Ollama-flavoured) messages to OpenAI shape.

    The agent stores assistant tool-calls as ``{"function": {"name", "arguments":
    <dict>}}`` (no id) and tool results as ``{"role": "tool", "tool_name", "content"}``.
    OpenAI-compatible APIs are stricter: each assistant tool-call needs an ``id`` +
    ``type`` and a JSON-**string** ``arguments``, and every tool result must carry a
    ``tool_call_id`` linking it back. run_tools appends one tool message per call in
    call order, so we assign synthetic ids and consume them in order.
    """
    out: list[dict] = []
    pending_ids: list[str] = []
    for idx, msg in enumerate(messages):
        role = msg.get("role")
        if role == "assistant" and msg.get("tool_calls"):
            pending_ids = []
            calls = []
            for j, tc in enumerate(msg["tool_calls"]):
                cid = f"call_{idx}_{j}"
                pending_ids.append(cid)
                fn = tc.get("function", {}) or {}
                calls.append(
                    {
                        "id": cid,
                        "type": "function",
                        "function": {
                            "name": fn.get("name"),
                            "arguments": json.dumps(fn.get("arguments") or {}),
                        },
                    }
                )
            out.append({"role": "assistant", "content": msg.get("content") or "", "tool_calls": calls})
        elif role == "tool":
            cid = pending_ids.pop(0) if pending_ids else f"call_{idx}_0"
            out.append({"role": "tool", "tool_call_id": cid, "content": msg.get("content") or ""})
        else:
            out.append({"role": role, "content": msg.get("content") or ""})
    return out


class OpenAICompatClient:
    """Calls any OpenAI-compatible /chat/completions endpoint (default: Gemini).

    Google Gemini exposes an OpenAI-compatible surface at
    ``…/v1beta/openai/chat/completions`` with native function calling, so the same
    client works for Gemini, Groq, Cerebras, Mistral, OpenRouter, … — only the
    base URL / model / key differ (all via settings)."""

    def __init__(
        self,
        *,
        model: str | None = None,
        base_url: str | None = None,
        api_key: str | None = None,
        timeout: float | None = None,
    ):
        self.model = model or settings.LLM_MODEL
        self.base_url = (base_url or settings.LLM_BASE_URL).rstrip("/")
        self.api_key = api_key or settings.LLM_API_KEY
        self.timeout = timeout or settings.AGENT_TIMEOUT_SECONDS

    async def chat(self, messages: list[dict], tools: list[dict]) -> LLMReply:
        payload: dict = {
            "model": self.model,
            "messages": _to_openai_messages(messages),
            "stream": False,
        }
        if tools:
            payload["tools"] = tools  # already in {"type":"function",...} shape
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(f"{self.base_url}/chat/completions", json=payload, headers=headers)
            resp.raise_for_status()
        choice = (resp.json().get("choices") or [{}])[0]
        message = choice.get("message", {}) or {}
        tool_calls = []
        for tc in message.get("tool_calls") or []:
            fn = tc.get("function", {}) or {}
            args = fn.get("arguments")
            if isinstance(args, str):
                try:
                    args = json.loads(args or "{}")
                except ValueError:
                    args = {}
            tool_calls.append(ToolCall(name=fn.get("name"), arguments=args or {}))
        return LLMReply(content=message.get("content") or None, tool_calls=tool_calls)


def get_llm() -> LLMClient:
    """FastAPI dependency — the live client. Overridden with a fake in tests.

    Local dev uses Ollama; set AI_PROVIDER=openai (+ LLM_* settings) to call a
    hosted OpenAI-compatible API such as Google Gemini in a deployed environment.
    """
    if settings.AI_PROVIDER == "openai":
        return OpenAICompatClient()
    return OllamaClient()
