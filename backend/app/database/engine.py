from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

from app.config import settings


def normalize_database_url(raw: str) -> tuple[str, dict]:
    """Make a hosted-Postgres URL safe for the asyncpg driver.

    Managed providers (Neon, Supabase, Render, …) hand out a libpq-style URL
    like ``postgresql://user:pass@host/db?sslmode=require&channel_binding=require``.
    Two things break the async stack and we fix them here so the raw URL can be
    pasted straight into ``DATABASE_URL``:

    - **scheme** — ``postgres``/``postgresql`` → ``postgresql+asyncpg`` (the async
      dialect). A URL that already names a driver is left untouched.
    - **libpq-only query params** — asyncpg doesn't understand ``sslmode`` /
      ``channel_binding``; we drop them and, when SSL was requested, pass
      ``ssl=True`` via connect_args instead. ``statement_cache_size=0`` is set
      alongside so the same URL also works through a PgBouncer transaction pooler
      (asyncpg's prepared-statement cache otherwise errors there).

    Returns the rewritten URL and the connect_args dict for create_async_engine.
    """
    parts = urlsplit(raw)
    scheme = parts.scheme
    if scheme in ("postgres", "postgresql"):
        scheme = "postgresql+asyncpg"

    query = dict(parse_qsl(parts.query))
    connect_args: dict = {}
    sslmode = query.pop("sslmode", None)
    query.pop("channel_binding", None)  # asyncpg negotiates this itself
    if sslmode and sslmode not in ("disable", "allow", "prefer"):
        connect_args["ssl"] = True
        connect_args["statement_cache_size"] = 0  # PgBouncer/pooler-safe

    url = urlunsplit((scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))
    return url, connect_args


def build_engine() -> AsyncEngine:
    """
    Creates the async SQLAlchemy engine.

    Key decisions explained:
    - pool_size=10: max persistent connections kept alive.
      For a 2-3 person team this is more than enough.
      Raise to 20 if you see connection wait times.

    - max_overflow=20: extra connections allowed above pool_size
      during traffic spikes. They are closed after use.

    - pool_pre_ping=True: before handing a connection from the pool,
      SQLAlchemy sends a lightweight SELECT 1 to verify it is still alive.
      Without this, stale connections after a DB restart cause
      cryptic errors in the middle of requests.

    - echo=settings.DB_ECHO: when True, every SQL statement is printed
      to stdout. Set DB_ECHO=True in .env during development only.
      Never True in production — it floods logs and leaks query structure.
    """
    url, connect_args = normalize_database_url(settings.DATABASE_URL)
    return create_async_engine(
        url,
        connect_args=connect_args,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
        echo=settings.DB_ECHO,
    )


# Single engine instance for the whole application.
# Imported by session.py and by tests.
engine = build_engine()
