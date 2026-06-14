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

## Desktop Development (Tauri)

Run the desktop application shell locally (make sure your dev server or backend is running if needed, or Tauri will launch Next.js automatically):

| Command | What it does |
| --- | --- |
| `pnpm tauri dev` | Runs the desktop app in development mode with hot-reloading. |
| `pnpm tauri build` | Performs a production desktop build locally (generates installer/bundle for host OS). |

## Release and Tag Workflow

Nextract uses Git tags to trigger cloud builds and auto-update generation.

### 1. Perform a New Release (Version Bump)
To sync versions across `package.json`, `web/package.json`, `server/pyproject.toml`, and `src-tauri/tauri.conf.json`:
```bash
# Bumps patch version (e.g. 1.13.0 -> 1.13.1)
pnpm release patch

# Or minor version (e.g. 1.13.0 -> 1.14.0)
pnpm release minor
```

### 2. Stage, Commit, and Tag the Release
```bash
# Stage all version/code changes
git add .

# Commit with a release message
git commit -m "chore: release v1.13.1"

# Create a local Git tag matching the version
git tag v1.13.1

# Push the branch and the tag to GitHub
git push origin phase-10
git push origin v1.13.1
```

### 3. Fixing/Replacing a Tag (e.g. if code was tagged before committing/pushing all files)
If a tag was pushed to GitHub but needs to be updated with new commits:
```bash
# 1. Delete the local tag
git tag -d v1.13.1

# 2. Delete the tag on the remote GitHub repository
git push origin :refs/tags/v1.13.1

# 3. Stage, commit, and push your latest code changes
git add .
git commit -m "feat: correct implementation details"
git push origin phase-10

# 4. Re-create and push the tag to trigger a clean rebuild
git tag v1.13.1
git push origin v1.13.1
```

