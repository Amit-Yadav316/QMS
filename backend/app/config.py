from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    DB_ECHO: bool = False

    # App
    SECRET_KEY: str
    ENVIRONMENT: str = "development"
    API_V1_PREFIX: str = "/api/v1"

    # File uploads (document store). UPLOAD_DIR is the local storage root today;
    # the storage layer is object-store-swappable later (see core/storage.py).
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_BYTES: int = 26_214_400  # 25 MB

    # AI analyst agent (Phase 8) — local Ollama behind a swappable LLM client.
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "qwen2.5:3b"
    AGENT_MAX_ITERATIONS: int = 4
    AGENT_TIMEOUT_SECONDS: int = 120

    # AISuggestion / RAG (Phase 9) — retrieve similar past CLOSED NCRs and ask
    # the LLM for a probable root cause + corrective actions. Embeddings come
    # from a local Ollama embedding model; similarity is computed in Python over
    # cached vectors (no pgvector — the corpus per project is small, and the
    # retrieval layer is swappable to pgvector later).
    OLLAMA_EMBED_MODEL: str = "nomic-embed-text"
    RAG_TOP_K: int = 3
    RAG_MIN_SIMILARITY: float = 0.0  # keep all neighbours by default; raise to prune

    # JWT
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    JWT_ALGORITHM: str = "HS256"

    # Email
    MAIL_USERNAME: str
    MAIL_PASSWORD: str
    MAIL_FROM: str
    MAIL_FROM_NAME: str = "Strata"
    MAIL_PORT: int = 587
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_STARTTLS: bool = True
    MAIL_SSL_TLS: bool = False

    # Frontend URL — used in invitation and dispatch email links
    FRONTEND_URL: str = "http://localhost:3000"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()