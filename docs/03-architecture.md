# 03 — Nextract Technical Architecture

## 1. Architecture Summary

Nextract uses a clean separation between:

- Frontend.
- Backend.
- Downloader engine.
- Queue/progress system.
- Local database.
- File system storage.
- Platform adapters.

The frontend gives users a clean interface.

The backend manages analysis, download jobs, progress, history, settings, and communication with yt-dlp and FFmpeg.

The app starts as a local-first web app and can later be packaged as a desktop app.

## 2. High-Level System

```txt
User
  ↓
Next.js Frontend
  ↓
FastAPI Backend
  ↓
Nextract Services Layer
  ↓
yt-dlp + FFmpeg
  ↓
Local File System

Backend also connects to:
  ↓
SQLite Database
  ↓
Settings + History + Jobs
```

## 3. Recommended Stack

## Frontend

- Next.js.
- TypeScript.
- Tailwind CSS.
- shadcn/ui or custom components.
- React Query or SWR.
- Framer Motion for subtle transitions if needed.

## Backend

- Python.
- FastAPI.
- uv.
- Pydantic.
- SQLite.
- SQLModel or SQLAlchemy.
- yt-dlp.
- FFmpeg.
- WebSockets or Server-Sent Events for progress.

## Local/Desktop Future

- Tauri preferred for lighter desktop packaging.
- Electron is acceptable if easier.
- Bundle backend, frontend, yt-dlp, FFmpeg, and SQLite.

## 4. Backend Setup with uv

Create the backend:

```bash
mkdir nextract
cd nextract

mkdir server
cd server

uv init
uv add fastapi uvicorn pydantic yt-dlp sqlalchemy sqlmodel
uv add --dev pytest ruff

uv run uvicorn app.main:app --reload
```

Recommended Python version:

```bash
uv python install 3.12
uv python pin 3.12
```

Run backend commands through uv:

```bash
uv run python --version
uv run uvicorn app.main:app --reload
uv run pytest
uv run ruff check .
```

## 5. Frontend Setup

Create the frontend:

```bash
mkdir apps
cd apps

pnpm create next-app web
cd web

pnpm add @tanstack/react-query
pnpm add lucide-react
pnpm add framer-motion
```

Optional UI setup:

```bash
pnpm dlx shadcn@latest init
```

## 6. Project Root Structure

```txt
nextract/
  README.md
  docs/
    01-vision.md
    02-mini-srs.md
    03-architecture.md
    04-design.md
    05-folder-structure.md
    PROGRESS.md

  web/
    app/
    components/
    lib/
    public/
    package.json
    next.config.ts
    tailwind.config.ts
    tsconfig.json

  server/
    pyproject.toml
    uv.lock
    app/
      main.py
      api/
      core/
      db/
      schemas/
      services/
      platforms/
      workers/
      utils/
    tests/

  data/
    nextract.db

  downloads/
    Nextract/

  scripts/
    dev.sh
    dev.ps1
```

## 7. Backend Folder Structure

```txt
server/
  pyproject.toml
  uv.lock

  app/
    main.py

    api/
      routes/
        health.py
        analyze.py
        downloads.py
        playlists.py
        history.py
        settings.py

    core/
      config.py
      errors.py
      security.py
      logging.py

    db/
      database.py
      models.py
      repositories.py

    schemas/
      analyze_schema.py
      download_schema.py
      playlist_schema.py
      history_schema.py
      settings_schema.py

    services/
      ytdlp_service.py
      format_service.py
      download_service.py
      playlist_service.py
      progress_service.py
      file_service.py
      settings_service.py
      history_service.py

    platforms/
      base.py
      youtube.py
      tiktok.py
      instagram.py
      x.py
      reddit.py
      vimeo.py

    workers/
      download_worker.py
      queue.py

    utils/
      filename.py
      platform_detector.py
      progress_parser.py
      validators.py

  tests/
    test_analyze.py
    test_format_service.py
    test_platform_detector.py
```

## 8. Frontend Folder Structure

```txt
web/
  app/
    page.tsx
    downloads/
      page.tsx
    history/
      page.tsx
    settings/
      page.tsx
    playlist/
      page.tsx

  components/
    layout/
      app-header.tsx
      app-sidebar.tsx
      mobile-nav.tsx

    downloader/
      url-input.tsx
      media-preview-card.tsx
      quality-selector.tsx
      audio-format-selector.tsx
      advanced-options.tsx

    playlist/
      playlist-summary-card.tsx
      playlist-item-row.tsx
      playlist-range-selector.tsx

    downloads/
      download-progress-card.tsx
      queue-list.tsx
      status-badge.tsx

    history/
      history-list.tsx
      history-filters.tsx
      history-item-card.tsx

    settings/
      settings-section.tsx
      folder-picker.tsx
      theme-selector.tsx

    common/
      empty-state.tsx
      error-card.tsx
      loading-state.tsx
      platform-badge.tsx

  lib/
    api.ts
    types.ts
    constants.ts
    format-labels.ts
    platform-icons.ts
    validators.ts

  public/
    icons/
    logo.svg
```

## 9. Core Backend Services

## 9.1 URL Analyzer Service

Responsibilities:

- Receive a URL.
- Validate the URL.
- Detect the platform.
- Call yt-dlp in metadata mode.
- Return clean media metadata.
- Detect playlist vs single media.

## 9.2 Format Service

Responsibilities:

- Convert technical yt-dlp formats into user-friendly quality options.
- Hide ugly format IDs from basic users.
- Support advanced format information later.

User-facing options:

```txt
Best Quality
1080p MP4
720p MP4
480p MP4
360p MP4
Audio Only - M4A
Audio Only - MP3
Original Format
```

## 9.3 Download Service

Responsibilities:

- Create download jobs.
- Build safe yt-dlp arguments.
- Start download process.
- Save output files.
- Update job status.
- Handle errors.

## 9.4 Playlist Service

Responsibilities:

- Detect playlist links.
- Fetch playlist metadata.
- Show item list.
- Support full playlist download.
- Support selected items.
- Support download range.
- Support skip existing.

## 9.5 Progress Service

Responsibilities:

- Parse download progress.
- Track percentage.
- Track speed.
- Track ETA.
- Send updates to frontend.
- Update database.

## 9.6 History Service

Responsibilities:

- Save successful downloads.
- Save failed downloads.
- Search history.
- Filter by platform/status/date.
- Re-download old items.

## 9.7 Settings Service

Responsibilities:

- Store default download folder.
- Store default quality.
- Store audio format.
- Store theme.
- Store filename template.
- Store playlist behavior.
- Store max parallel downloads.

## 10. API Endpoints

## Health

```txt
GET /api/health
```

Response:

```json
{
  "status": "ok",
  "app": "Nextract"
}
```

## Analyze URL

```txt
POST /api/analyze
```

Request:

```json
{
  "url": "https://example.com/video"
}
```

Response:

```json
{
  "platform": "youtube",
  "type": "video",
  "title": "Example Video",
  "thumbnail": "https://example.com/thumb.jpg",
  "duration": 615,
  "qualities": [
    {
      "label": "1080p MP4",
      "value": "1080p",
      "available": true
    },
    {
      "label": "720p MP4",
      "value": "720p",
      "available": true
    },
    {
      "label": "Audio Only - M4A",
      "value": "audio_m4a",
      "available": true
    }
  ]
}
```

## Create Download Job

```txt
POST /api/downloads
```

Request:

```json
{
  "url": "https://example.com/video",
  "quality": "720p",
  "downloadType": "video",
  "audioFormat": null,
  "saveThumbnail": false,
  "saveSubtitles": false
}
```

Response:

```json
{
  "jobId": "job_123",
  "status": "pending"
}
```

## Get Queue

```txt
GET /api/downloads
```

## Get Job

```txt
GET /api/downloads/{jobId}
```

## Cancel Job

```txt
POST /api/downloads/{jobId}/cancel
```

## Retry Job

```txt
POST /api/downloads/{jobId}/retry
```

## Get History

```txt
GET /api/history
```

## Get Settings

```txt
GET /api/settings
```

## Update Settings

```txt
PATCH /api/settings
```

## 11. Database Schema

## downloads

```txt
id
url
platform
media_type
title
thumbnail
duration
selected_quality
audio_format
status
progress
output_path
file_size
error_message
created_at
updated_at
completed_at
```

## playlists

```txt
id
url
platform
title
thumbnail
total_items
downloaded_items
status
created_at
updated_at
```

## playlist_items

```txt
id
playlist_id
url
title
thumbnail
duration
item_index
status
output_path
error_message
created_at
updated_at
```

## settings

```txt
id
download_folder
default_quality
default_audio_format
theme
filename_template
max_parallel_downloads
save_thumbnails
save_subtitles
skip_existing
created_at
updated_at
```

## 12. Platform Adapter System

Each platform should be handled through an adapter.

```txt
platforms/
  base.py
  youtube.py
  tiktok.py
  instagram.py
  x.py
  reddit.py
  vimeo.py
```

Each adapter should expose:

```python
class BasePlatformAdapter:
    name = "base"

    def can_handle(self, url: str) -> bool:
        raise NotImplementedError

    def analyze(self, url: str):
        raise NotImplementedError

    def normalize_formats(self, raw_formats: list):
        raise NotImplementedError

    def build_download_args(self, job):
        raise NotImplementedError
```

## 13. Safety Rules

The backend must:

- Validate URLs.
- Block unsupported protocols.
- Avoid shell injection.
- Use argument arrays instead of raw shell strings.
- Avoid running arbitrary user input.
- Avoid downloading private/restricted content.
- Avoid DRM bypassing.
- Avoid paywall bypassing.
- Limit parallel downloads.
- Store files only in approved folders.
- Sanitize filenames.
- Log errors safely.

## 14. MVP Build Order

## Phase 1 — Foundation

- Create repo.
- Add docs.
- Set up frontend.
- Set up backend with uv.
- Add FastAPI health endpoint.
- Add SQLite database.

## Phase 2 — YouTube Analysis

- Add `/api/analyze`.
- Connect yt-dlp metadata extraction.
- Normalize media metadata.
- Normalize quality options.
- Display preview in frontend.

## Phase 3 — Single Download

- Create download job.
- Run yt-dlp safely.
- Save file.
- Update status.
- Show progress.

## Phase 4 — History and Settings

- Save completed downloads.
- Add history page.
- Add settings page.
- Allow changing download folder.

## Phase 5 — Playlist Support

- Detect playlist.
- Show playlist items.
- Download full playlist.
- Support range and selected items.
- Skip existing items.

## Phase 6 — Polish

- Improve UI.
- Add dark mode.
- Add friendly errors.
- Add loading states.
- Add empty states.
- Add responsive mobile layout.

## Phase 7 — Multi-Platform Expansion

- Add adapters one by one.
- Start with platforms that work reliably.
- Keep platform-specific logic isolated.
