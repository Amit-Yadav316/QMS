"""embeddings.py — swappable text-embedding client for Phase-9 RAG.

The suggestion pipeline turns a closed NCR (or the current failing case) into a
vector only through ``Embedder.embed(texts)``. The default implementation calls
a local Ollama embedding model (``nomic-embed-text``) over ``/api/embed``; tests
inject a deterministic fake via the ``get_embedder`` dependency, so the build
never depends on a model download. Similarity is plain cosine computed here in
Python — the per-project NCR corpus is small, so there is no need for pgvector;
swapping to a vector index later is a single new ``Embedder`` plus a retrieval
change, nothing else.
"""

import math
from typing import Protocol, runtime_checkable

import httpx

from app.config import settings


@runtime_checkable
class Embedder(Protocol):
    async def embed(self, texts: list[str]) -> list[list[float]]: ...


class OllamaEmbedder:
    """Calls a local Ollama server's /api/embed for one or more inputs."""

    def __init__(
        self,
        *,
        model: str | None = None,
        base_url: str | None = None,
        timeout: float | None = None,
    ):
        self.model = model or settings.OLLAMA_EMBED_MODEL
        self.base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/")
        self.timeout = timeout or settings.AGENT_TIMEOUT_SECONDS

    async def embed(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        payload = {"model": self.model, "input": texts}
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(f"{self.base_url}/api/embed", json=payload)
            resp.raise_for_status()
        data = resp.json()
        # /api/embed returns {"embeddings": [[...], ...]}; tolerate the older
        # singular /api/embeddings {"embedding": [...]} shape as a fallback.
        embeddings = data.get("embeddings")
        if embeddings is None and "embedding" in data:
            embeddings = [data["embedding"]]
        return [[float(x) for x in vec] for vec in (embeddings or [])]


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Cosine similarity in [-1, 1]; 0.0 for a zero or mismatched vector."""
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b, strict=True))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0.0 or nb == 0.0:
        return 0.0
    return dot / (na * nb)


class OpenAICompatEmbedder:
    """Calls any OpenAI-compatible /embeddings endpoint (default: Gemini).

    Same seam as the LLM client — Gemini's compatibility endpoint serves
    embeddings at ``…/v1beta/openai/embeddings`` with ``gemini-embedding-001``, so
    one hosted key powers both the analyst agent and RAG."""

    def __init__(
        self,
        *,
        model: str | None = None,
        base_url: str | None = None,
        api_key: str | None = None,
        timeout: float | None = None,
    ):
        self.model = model or settings.EMBED_MODEL
        self.base_url = (base_url or settings.LLM_BASE_URL).rstrip("/")
        self.api_key = api_key or settings.LLM_API_KEY
        self.timeout = timeout or settings.AGENT_TIMEOUT_SECONDS

    async def embed(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        payload = {"model": self.model, "input": texts}
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(f"{self.base_url}/embeddings", json=payload, headers=headers)
            resp.raise_for_status()
        data = resp.json().get("data") or []
        return [[float(x) for x in item.get("embedding") or []] for item in data]


def get_embedder() -> Embedder:
    """FastAPI dependency — the live embedder. Overridden with a fake in tests.

    Mirrors get_llm: Ollama for dev, or a hosted OpenAI-compatible embeddings API
    (Google Gemini) when AI_PROVIDER=openai.
    """
    if settings.AI_PROVIDER == "openai":
        return OpenAICompatEmbedder()
    return OllamaEmbedder()
