# Repository Guidelines

## Project Structure & Module Organization
- Application code lives in `src/fabricat_backend`. Key areas: `api/` (FastAPI app, routers, services), `database/` (SQLAlchemy schemas and repositories), `game_logic/` (turn/phase mechanics and timers), and `shared/` (cross-cutting utilities). Entrypoints are in `main.py` and `__init__.py`.
- Migrations sit in `alembic/`; config is `alembic.ini`. Tests are under `tests/` (unit, integration, and e2e coverage for API and gameplay).

## Setup, Build, and Run
- Install dependencies with `uv sync` (uses Python 3.12, respects `uv.lock`). Add `--dev` when developing locally.
- Start the dev server with reload: `uv run dev` (FastAPI on `api_host:api_port` from settings).
- Production-like serve: `uv run serve` (no reload).
- Type check: `uv run pyright`. Lint/format: `uv run ruff check .` and `uv run ruff format .`.

## Coding Style & Naming Conventions
- Ruff enforces formatting (line length 88, 4-space indent, double quotes). Follow PEP 8 with explicit type hints; numpy-style docstrings where docstrings exist.
- Keep modules/functions/classes in `snake_case`/`PascalCase`; constants in `UPPER_SNAKE_CASE`.
- Prefer dependency injection via FastAPI overrides and keep database access isolated in `database/repositories/`.

## Testing Guidelines
- Framework: `pytest` with markers `unit` and `integration` (see `pyproject.toml`). Run everything via `uv run pytest`; subset with `uv run pytest -m unit` or `-m integration`.
- Tests live in `tests/test_*.py`. Mirror package structure (e.g., `tests/game_logic/` for `game_logic/`).
- Ensure new features ship with unit coverage; add integration tests for routers/services that touch the DB or websockets.

## Commit & Pull Request Guidelines
- Use Conventional Commit prefixes seen in history (`feat:`, `fix:`, `chore:`, etc.); reference issues/PR IDs where relevant.
- Before opening a PR, run `uv run ruff check .`, `uv run ruff format .`, `uv run pyright`, and `uv run pytest`. Note results in the PR description.
- PRs should summarize behavior changes, include reproduction/validation notes, and attach API examples or screenshots when UI/API responses change.

## Configuration & Security
- Settings come from `.env` (see `BackendSettings`): `database_url`, `api_host`, `api_port`, and `auth_secret_key` (required). Never commit secrets; use local `.env` and deployment-specific env vars.
- For DB work, align Alembic revisions with model changes and keep `alembic.ini`/`env.py` in sync with `database/schemas`.
