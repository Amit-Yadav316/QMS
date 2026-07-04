# syntax=docker/dockerfile:1

# ── Builder: resolve & install dependencies into a project venv ──────────────
FROM python:3.11-slim AS builder

# uv binary (pinned image) — fast, reproducible installs from uv.lock.
COPY --from=ghcr.io/astral-sh/uv:0.5 /uv /uvx /bin/

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=0

WORKDIR /app

# Install deps first (cached layer) using only the lock + manifest.
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-install-project --no-dev

# Now add the application source and install the project itself.
COPY . .
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev

# ── Runtime: slim image with just the venv + app ────────────────────────────
FROM python:3.11-slim AS runtime

WORKDIR /app

# Run as a non-root user.
RUN useradd --create-home --uid 1000 appuser

COPY --from=builder --chown=appuser:appuser /app /app

# Put the project venv on PATH so `uvicorn`/`alembic` resolve directly.
ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1

USER appuser
EXPOSE 8000

# Hosted platforms inject $PORT; the entrypoint migrates then serves on it.
# (Local: `docker run -p 8000:8000 …` works with the default.)
CMD ["sh", "scripts/start.sh"]
