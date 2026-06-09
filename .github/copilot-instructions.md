# GitHub Copilot Instructions — Nextract

This file provides context for GitHub Copilot when working inside the Nextract repository.
Read the full `docs/` folder for planning decisions. This file covers day-to-day code generation rules.

---

## Project Overview

**Nextract** is a local-first media extraction and archiving app.

The primary user flow:

```
Paste URL → Analyze → Choose Quality → Download → Organized file saved
```

MVP scope: YouTube only. Single videos, playlists, audio-only, download queue, history, settings.

---

## Stack

### Frontend (`web/`)

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Components | shadcn/ui or custom |
| Server state | React Query or SWR |
| Animation | Framer Motion (minimal, purposeful) |
| Icons | Lucide React |

### Backend (`server/`)

| Layer | Choice |
|---|---|
| Framework | FastAPI |
| Language | Python 3.12 |
| Package manager | uv |
| Validation | Pydantic v2 |
| ORM | SQLModel or SQLAlchemy |
| Database | SQLite |
| Downloader | yt-dlp |
| Media processing | FFmpeg |
| Progress | WebSockets or Server-Sent Events |

---

## Backend Conventions

### Always use `uv` for Python commands

```bash
# correct
uv run uvicorn app.main:app --reload
uv run pytest
uv run ruff check .
uv add fastapi

# wrong
pip install fastapi
python main.py
```

### Route handlers are thin

```python
# correct
@router.post("/analyze")
async def analyze_url(body: AnalyzeRequest) -> AnalyzeResponse:
    return await analyze_service.analyze(body.url)

# wrong — business logic in route
@router.post("/analyze")
async def analyze_url(body: AnalyzeRequest):
    info = yt_dlp.YoutubeDL().extract_info(body.url, download=False)
    # ... 40 more lines
```

### yt-dlp must always use argument arrays, never shell strings

```python
# correct
args = ["--dump-json", "--no-playlist", url]
result = subprocess.run(["yt-dlp", *args], capture_output=True, text=True)

# WRONG — shell injection risk
result = subprocess.run(f"yt-dlp --dump-json {url}", shell=True)
```

### Pydantic schemas for all API shapes

```python
class AnalyzeRequest(BaseModel):
    url: HttpUrl

class QualityOption(BaseModel):
    label: str
    value: str
    available: bool

class AnalyzeResponse(BaseModel):
    platform: str
    type: str
    title: str
    thumbnail: str
    duration: int
    qualities: list[QualityOption]
```

### Error responses must be user-friendly

```python
# correct
raise HTTPException(
    status_code=422,
    detail="This link points to a private video. Only public media can be downloaded."
)

# wrong — exposes internals
raise HTTPException(status_code=500, detail=str(e))
```

### File and folder rules

- All downloads go inside `downloads/Nextract/`
- Sanitize filenames before writing. Use `utils/filename.py`.
- Never construct file paths by string concatenation with user input.

```python
# correct
safe_name = sanitize_filename(title)
output_path = BASE_DOWNLOAD_DIR / platform / safe_name

# wrong
output_path = f"/downloads/{user_input}"
```

### Platform adapters follow the base class

```python
# every adapter in platforms/
class YouTubeAdapter(BasePlatformAdapter):
    name = "youtube"

    def can_handle(self, url: str) -> bool:
        return "youtube.com" in url or "youtu.be" in url

    def analyze(self, url: str) -> dict:
        ...

    def normalize_formats(self, raw_formats: list) -> list[QualityOption]:
        ...

    def build_download_args(self, job: DownloadJob) -> list[str]:
        ...
```

---

## Frontend Conventions

### Never call fetch directly in components

```typescript
// correct — use the API client
import { analyzeUrl } from "@/lib/api";

const result = await analyzeUrl(url);

// wrong
const result = await fetch("/api/analyze", { ... });
```

### Every async state needs three UI states

```tsx
// correct
if (isLoading) return <LoadingState />;
if (error) return <ErrorCard message={error.message} />;
if (!data) return <EmptyState />;
return <MediaPreviewCard data={data} />;
```

### Keep pages thin

```tsx
// correct — page fetches data, delegates rendering
export default function DownloadsPage() {
  const { data, isLoading, error } = useDownloadQueue();
  return <QueueList items={data} isLoading={isLoading} error={error} />;
}

// wrong — all logic in the page
export default function DownloadsPage() {
  const [jobs, setJobs] = useState([]);
  useEffect(() => {
    fetch("/api/downloads").then(...).then(setJobs);
  }, []);
  return (
    <div>
      {jobs.map(job => (
        <div key={job.id}>
          {/* 80 lines of JSX */}
        </div>
      ))}
    </div>
  );
}
```

### Component file placement

```
URL input field          → components/downloader/url-input.tsx
Media preview            → components/downloader/media-preview-card.tsx
Quality selection        → components/downloader/quality-selector.tsx
Download progress card   → components/downloads/download-progress-card.tsx
Status badge             → components/downloads/status-badge.tsx
History row              → components/history/history-item-card.tsx
Empty state              → components/common/empty-state.tsx
```

---

## Design System

### Colors (use CSS variables or Tailwind config values)

| Token | Light | Dark | Usage |
|---|---|---|---|
| Primary | `#4F46E5` | `#4F46E5` | CTA buttons, active states |
| Background | `#F9FAFB` | `#0F172A` | Page background |
| Surface | `#FFFFFF` | `#1E293B` | Cards, inputs |
| Text | `#1F2937` | `#F1F5F9` | Body text |
| Success | `#10B981` | `#10B981` | Completed badge |
| Warning | `#F59E0B` | `#F59E0B` | In-progress badge |
| Error | `#EF4444` | `#EF4444` | Failed badge |

### Border radius

| Context | Value |
|---|---|
| Cards, modals | `16px` / `rounded-2xl` |
| Buttons, inputs | `8px` / `rounded-lg` |
| Badges, pills | `9999px` / `rounded-full` |

### Typography

- Font family: **Inter** only
- Use `font-mono` or tabular numbers for: percentages, file sizes, speeds, ETAs
- Never use decorative fonts

### Spacing

- All spacing must be multiples of 8px
- Section gaps: `48px` (`gap-12`)
- Card internal padding: `24px` (`p-6`)
- Max content width: `1200px`

---

## API Reference

```
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

### Quality option values

```
best
1080p
720p
480p
360p
audio_m4a
audio_mp3
audio_opus
```

---

## What Copilot Should Never Suggest

- `shell=True` in any `subprocess` call
- Raw SQL queries outside of `db/repositories.py`
- Hardcoded file paths using string concatenation with user input
- Fetch calls directly inside React components
- Business logic inside Next.js page files
- Any implementation related to DRM bypass, paywall bypass, or private account access
- Secrets or API keys inline in code
- Platform-specific logic outside the platform adapter files

---

## Commit Message Format

```
type(scope): short description

feat(api): add /api/analyze endpoint
fix(ytdlp): handle unavailable video error
style(ui): update quality selector pill states
chore(deps): add sqlmodel via uv
refactor(services): split download service into job and progress
test(analyze): add playlist detection test
docs(readme): add setup instructions
```

---

## What Is Not Implemented Yet (Do Not Generate)

- Multi-platform support beyond YouTube
- User authentication
- Cloud sync
- Desktop app packaging
- Browser extension
- Scheduled downloads
- Media playback
- Any feature listed in `docs/FUTURE_PLAN.md`