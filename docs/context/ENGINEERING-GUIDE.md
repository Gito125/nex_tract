# Engineering Guide

This file contains the durable implementation rules for Nextract. Keep `AGENTS.md` and `.github/copilot-instructions.md` short and link here instead of duplicating these details.

## Stack

Frontend (`web/`):

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui or custom components
- React Query or SWR
- Framer Motion for minimal, purposeful transitions
- Lucide React icons

Backend (`server/`):

- FastAPI
- Python 3.12
- uv
- Pydantic v2
- SQLModel or SQLAlchemy
- SQLite
- yt-dlp
- FFmpeg
- WebSockets or Server-Sent Events for progress

## Backend Rules

Always use `uv` for Python commands:

```bash
uv run uvicorn app.main:app --reload
uv run pytest
uv run ruff check .
uv add fastapi
```

Do not use `pip install` or direct `python main.py` workflows for backend development.

Keep FastAPI route handlers thin. Routes should validate input, call a service, and return a schema. Put business logic in services, platform adapters, repositories, workers, or utilities.

Call `yt-dlp` with argument arrays only. Never use shell strings or `shell=True`.

```python
args = ["--dump-json", "--no-playlist", url]
result = subprocess.run(["yt-dlp", *args], capture_output=True, text=True)
```

Use Pydantic schemas for all API request and response shapes.

Return user-friendly errors. Do not expose raw exception strings, stack traces, command internals, or filesystem details in API responses.

All downloads go inside `downloads/Nextract/`. Sanitize filenames before writing, use `utils/filename.py`, and never construct file paths by concatenating user input.

Platform logic belongs in platform adapter files. MVP implementation is YouTube only.

## Frontend Rules

Never call `fetch` directly in React components. Use the API client in `web/lib/`.

Every async UI path needs loading, error, and empty states before rendering data.

Keep Next.js pages thin. Pages should compose hooks and components, while substantial UI belongs in `web/components/`.

Expected component placement:

```txt
URL input field          -> components/downloader/url-input.tsx
Media preview            -> components/downloader/media-preview-card.tsx
Quality selection        -> components/downloader/quality-selector.tsx
Download progress card   -> components/downloads/download-progress-card.tsx
Status badge             -> components/downloads/status-badge.tsx
History row/card         -> components/history/history-item-card.tsx
Empty state              -> components/common/empty-state.tsx
Settings section         -> components/settings/settings-section.tsx
```

Use the design system in [docs/04-design.md](../04-design.md) and [docs/design/DESIGN.md](../design/DESIGN.md). For meaningful UI work, also apply the `impeccable` and `frontend-design` skills where available.

## API Reference

```txt
GET  /api/health
POST /api/analyze          { url: string }
POST /api/downloads        { url, quality, downloadType, audioFormat }
GET  /api/downloads        list queue
GET  /api/downloads/:id    job detail
POST /api/downloads/:id/cancel
POST /api/downloads/:id/retry
GET  /api/history
GET  /api/settings
PATCH /api/settings
```

Quality option values:

```txt
best
1080p
720p
480p
360p
audio_m4a
audio_mp3
audio_opus
```

## Do Not Generate

- `shell=True` in subprocess calls.
- Raw SQL queries outside repository/data-access modules.
- Hardcoded file paths built with user input.
- Fetch calls directly inside React components.
- Business logic inside Next.js page files.
- DRM bypass, paywall bypass, private account access, or restriction circumvention.
- Inline secrets or API keys.
- Non-YouTube platform implementation before it is active scope.

## Commit Messages

Use this format:

```txt
type(scope): short description

feat(api): add analyze endpoint
fix(ytdlp): handle unavailable video error
style(ui): update quality selector pill states
chore(deps): add sqlmodel via uv
refactor(services): split download service
test(analyze): add playlist detection test
docs(readme): add setup instructions
```
