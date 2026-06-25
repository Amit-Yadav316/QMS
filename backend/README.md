# Construction QMS — Backend

FastAPI + async SQLAlchemy backend for the Construction Quality Management System.
Dependencies and the virtual environment are managed with [**uv**](https://docs.astral.sh/uv/).

## Tech stack

| | |
|---|---|
| Language | Python **3.11** (deps lack 3.13 wheels; pinned `>=3.11,<3.13`) |
| Web | FastAPI 0.111 · Uvicorn |
| ORM | SQLAlchemy 2.0 (async) · asyncpg |
| Migrations | Alembic (multi-schema, async) |
| DB | PostgreSQL 16 on **port 5433**, database `construction_db` |
| Auth | JWT (python-jose) · passlib + bcrypt |
| Email | fastapi-mail + Jinja2 |
| Tooling | uv · pytest + pytest-asyncio · ruff · Docker |

## Project structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app, router registration, CORS
│   ├── config.py            # pydantic-settings, reads .env
│   ├── core/                # security (JWT/bcrypt), dependencies, exceptions, email
│   ├── database/            # DeclarativeBase, async engine, get_db() session
│   ├── models/              # auth, master, transaction, quality, audit (5 schemas)
│   ├── schemas/             # Pydantic request/response models (auth, master)
│   ├── repositories/        # DB query layer (base_repo + per-resource repos)
│   ├── services/            # business logic (auth, project, supplier, lab)
│   ├── routers/             # /auth, /projects, /suppliers, /labs
│   └── templates/email/     # invitation, truck_dispatch, truck_result, lab_reminder
├── alembic/                 # env.py (creates all 5 schemas) + versions/
├── tests/
│   ├── conftest.py          # test-DB bootstrap, fixtures, email stub
│   ├── helpers.py
│   ├── unit/                # security, invite-permission matrix
│   └── integration/         # auth flow, client→project→contractor E2E, schema coverage
├── pyproject.toml           # deps, dev group, build, pytest + ruff config
├── uv.lock                  # pinned, reproducible dependency graph (committed)
├── .python-version          # 3.11
├── alembic.ini
├── Dockerfile · .dockerignore
└── .env.sample
```

### Database schemas

| Schema | Contents |
|--------|----------|
| `auth` | organisations, users, project_team, org_invitations, token_blacklist |
| `master` | projects, towers, floors, components, grades, suppliers, mix_designs, testing_labs |
| `transaction` | pours, dispatches, truck verification, cube_samples |
| `quality` | cube_tests, ncrs, penalties, corrective_actions, ai_suggestions |
| `audit` | audit_logs, ingestion_logs, embeddings |

## Setup

### Prerequisites
- [uv](https://docs.astral.sh/uv/getting-started/installation/)
- PostgreSQL 16 running on port 5433 (database `construction_db`)

### 1. Install dependencies
```bash
cd backend
uv sync          # creates .venv (Python 3.11) and installs locked deps + dev tools
```
`uv sync` editable-installs the `app` package, so `app.*` imports resolve everywhere —
no `PYTHONPATH` juggling needed.

### 2. Configure environment
```bash
cp .env.sample .env
# fill in DATABASE_URL, SECRET_KEY, MAIL_* (see .env.sample)
```
Generate a secret key: `uv run python -c "import secrets; print(secrets.token_hex(32))"`

### 3. Create the database & run migrations
```bash
# create the DB once (psql, or any client), then:
uv run alembic upgrade head     # alembic/env.py creates all 5 schemas automatically
```

### 4. Run the server
```bash
uv run uvicorn app.main:app --reload
```
- API base: `http://localhost:8000/api/v1`
- Swagger: `http://localhost:8000/docs`

## Common commands

```bash
uv sync                         # install / update the environment from uv.lock
uv add <pkg>                    # add a runtime dependency (updates pyproject + uv.lock)
uv add --dev <pkg>              # add a dev dependency
uv run uvicorn app.main:app --reload
uv run alembic revision --autogenerate -m "msg"
uv run alembic upgrade head
uv run pytest                   # full suite (uses a dedicated construction_test_db)
uv run ruff check .             # lint
uv run ruff format .            # format
```

## Testing

Tests are hermetic: `tests/conftest.py` creates a separate **`construction_test_db`**
on the same server, builds the schema from the models, truncates between tests, and
stubs outbound email. The live `construction_db` is never touched.

```bash
uv run pytest            # unit + integration
uv run pytest tests/unit
```

## Auth endpoints

Base: `/api/v1`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | — | Client self-registers (org + CLIENT_ADMIN); returns an OTP challenge |
| POST | `/auth/verify-otp` | — | Verify the emailed code → activate account + tokens |
| POST | `/auth/resend-otp` | — | Re-send a verification code |
| POST | `/auth/login` | — | Login, returns access + refresh tokens |
| POST | `/auth/refresh` | — | New access token from refresh token |
| POST | `/auth/accept-invitation` | — | Accept invite, create account (returns OTP challenge) |
| POST | `/auth/logout` | Bearer | Blacklist current access token |
| GET | `/auth/me` | Bearer | Current user + organisation |
| GET | `/auth/team` | Bearer | Org directory (users + pending invitations) |
| POST | `/auth/invite` | role-based | Invite a user to your org |

Account activation uses an **email OTP** (activation only): register / accept-invitation create
an inactive account and email a 6-digit code; `verify-otp` activates it and issues tokens.
Login itself is password-only.

Project-scoped endpoints (visibility + management are scoped per project):

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST/GET | `/projects` | Create (CLIENT_ADMIN) / list (membership-scoped) |
| GET | `/projects/{id}` | Detail + the viewer's `access` capabilities |
| GET/POST | `/projects/{id}/members` | List / assign-or-invite a member |
| GET/POST | `/projects/{id}/contractors` | List / bring a contractor onto the project |
| GET/POST | `/projects/{id}/suppliers` | List / register an RMC supplier (contractor side) |
| GET/POST | `/projects/{id}/labs` | List / register a testing lab (contractor side) |
| GET | `/projects/assigned` | A contractor org's project links (accept screen) |
| POST | `/projects/assigned/{pc_id}/accept` \| `/decline` | Contractor admin responds |

### Role model
```
Org roles:     CLIENT_ADMIN, CLIENT_USER, CONTRACTOR_ADMIN, CONTRACTOR_USER,
               PROJECT_MANAGER, QUALITY_ENGINEER, SUPERVISOR
Org invites (/auth/invite):
  CLIENT_ADMIN      → CLIENT_USER
  CONTRACTOR_ADMIN  → CONTRACTOR_USER, PROJECT_MANAGER, SUPERVISOR, QUALITY_ENGINEER
  CONTRACTOR_USER   → PROJECT_MANAGER, SUPERVISOR, QUALITY_ENGINEER

Project flow:
  CLIENT_ADMIN  creates project + assigns CLIENT_LEAD members
  CLIENT_LEAD   brings on a contractor (project link starts PENDING)
  CONTRACTOR_ADMIN  accepts the project + assigns CONTRACTOR_LEAD members
  CONTRACTOR_LEAD   registers suppliers/labs + assigns PROJECT_MANAGER/QE/SUPERVISOR
```

## Docker

```bash
# build from the repo root or backend/
docker build -t qms-backend backend
docker run --rm -p 8000:8000 --env-file backend/.env qms-backend
```
The image is a multi-stage uv build, runs as a non-root user, and serves
`app.main:app` on port 8000. Provide configuration via `--env-file` / runtime env —
secrets are never baked into the image.

## Notes

- **bcrypt** is pinned to `4.0.1` for passlib compatibility; the
  `(trapped) error reading bcrypt version` warning is harmless.
- Adding a value to an existing PostgreSQL enum needs a manual migration step:
  `op.execute("ALTER TYPE schema.enumname ADD VALUE IF NOT EXISTS 'NEW_VALUE'")`.
