# Core Commands

Quick reference for the main Nextract development commands.

Run commands from the project root unless the command says to `cd` into a folder.

## Frontend: Next.js

The frontend lives in `web/` and uses `pnpm`.

| Command | What it does |
| --- | --- |
| `pnpm install` | Installs all workspace dependencies. |
| `pnpm --filter @nextract/web dev` | Starts the Next.js development server. |
| `pnpm --filter @nextract/web build` | Builds the production frontend. |
| `pnpm --filter @nextract/web start` | Runs the built production frontend after `build`. |
| `pnpm --filter @nextract/web lint` | Runs ESLint on the frontend code. |

Equivalent commands from inside `web/`:

| Command | What it does |
| --- | --- |
| `cd web` | Moves into the frontend app folder. |
| `pnpm dev` | Starts the Next.js development server. |
| `pnpm build` | Builds the production frontend. |
| `pnpm start` | Runs the built production frontend. |
| `pnpm lint` | Runs ESLint for the frontend. |

## Backend: uv and Python

The backend lives in `server/` and must use `uv` for Python commands.

| Command | What it does |
| --- | --- |
| `cd server` | Moves into the backend app folder. |
| `uv sync` | Installs Python dependencies from `pyproject.toml` and `uv.lock`. |
| `uv run python main.py` | Runs the current Python entry file. |
| `uv run pytest` | Runs the backend test suite. |
| `uv run ruff check .` | Checks Python code style and lint issues. |
| `uv run ruff format .` | Formats Python code with Ruff. |
| `uv add package-name` | Adds a runtime backend dependency. |
| `uv add --dev package-name` | Adds a development-only backend dependency. |
| `uv remove package-name` | Removes a backend dependency. |
| `uv lock` | Updates the lockfile after dependency changes. |

## Backend: FastAPI

Use these once the FastAPI app module exists.

| Command | What it does |
| --- | --- |
| `cd server` | Moves into the backend app folder. |
| `uv run uvicorn app.main:app --reload` | Starts the FastAPI development server with auto-reload. |
| `uv run uvicorn app.main:app` | Starts the FastAPI app without auto-reload. |

If the app stays in `server/main.py` instead of `server/app/main.py`, use:

```bash
uv run uvicorn main:app --reload
```

## Common Local Workflow

Start the backend:

```bash
cd server
uv sync
uv run uvicorn app.main:app --reload
```

Start the frontend in another terminal:

```bash
pnpm --filter @nextract/web dev
```

Run checks before committing:

```bash
pnpm --filter @nextract/web lint
cd server
uv run ruff check .
uv run pytest
```
