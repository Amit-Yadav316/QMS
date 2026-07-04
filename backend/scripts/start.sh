#!/usr/bin/env sh
# Container entrypoint for hosted deploys (Render / Koyeb / Fly / …).
#
#   1. Apply DB migrations to the target database (idempotent — a no-op when the
#      schema is already at head, so it is safe to run on every boot).
#   2. Serve the app on the platform-injected $PORT (falls back to 8000 locally).
#
# `exec` hands PID 1 to uvicorn so it receives SIGTERM directly for clean shutdown.
set -e

echo "==> alembic upgrade head"
alembic upgrade head

echo "==> starting uvicorn on port ${PORT:-8000}"
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
