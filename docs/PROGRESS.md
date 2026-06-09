# Nextract Progress Tracker

Use this file to track the project phase by phase.

Update it as you build.

## Progress Legend

```txt
[ ] Not started
[/] In progress
[x] Completed
[!] Blocked
```

## Current Focus

```txt
Current Phase: Phase 3 — Single Video Download
Current Goal: Add download job creation, safe yt-dlp download execution, and queue status UI for one YouTube video.
```

---

# Phase 0 — Planning and Design

## Goal

Clearly define the project before coding.

## Tasks

- [x] Choose project name: Nextract.
- [x] Define meaning: Nexus + Extract.
- [x] Create project vision document.
- [x] Create mini SRS.
- [x] Create architecture document.
- [x] Create Google Stitch design brief.
- [x] Create folder structure document.
- [x] Create progress tracker.
- [x] Generate UI ideas using Google Stitch.
- [x] Choose final UI direction.
- [x] Decide final color palette.
- [x] Decide final typography.
- [x] Decide logo direction.

## Exit Criteria

Phase 0 is complete when:

- The docs are ready.
- The UI direction is selected.
- The first version of the design is clear.
- The project structure is ready to create.

---

# Phase 1 — Project Setup

## Goal

Create the actual project skeleton.

## Tasks

## Root Setup

- [x] Create `nextract/` root folder.
- [x] Initialize Git.
- [x] Add `.gitignore`.
- [x] Add `.env.example`.
- [x] Add `README.md`.
- [x] Add `docs/` folder.

## Backend Setup

- [x] Create `server/` folder.
- [x] Run `uv init`.
- [x] Install backend dependencies with uv.
- [x] Pin Python version with uv.
- [x] Create FastAPI app.
- [x] Add `/api/health` endpoint.
- [x] Add basic config file.
- [x] Add basic error handling.

## Frontend Setup

- [x] Create `web/` Next.js app.
- [x] Install Tailwind CSS.
- [x] Install UI dependencies.
- [x] Create base layout.
- [x] Create home page.
- [x] Connect frontend to backend health endpoint.

## Exit Criteria

Phase 1 is complete when:

- Frontend runs.
- Backend runs.
- Frontend can call backend health endpoint.
- Project folders are clean.

---

# Phase 2 — YouTube Link Analysis

## Goal

Analyze YouTube links and return clean metadata.

## Tasks

## Backend

- [x] Add `/api/analyze` endpoint.
- [x] Add URL validation.
- [x] Add platform detector.
- [x] Add YouTube platform adapter.
- [x] Add yt-dlp metadata extraction.
- [x] Return title.
- [x] Return thumbnail.
- [x] Return duration.
- [x] Return platform.
- [x] Return media type.
- [x] Return raw formats.
- [x] Add format normalization service.
- [x] Return clean quality options.

## Frontend

- [x] Build URL input card.
- [x] Build loading state.
- [x] Build media preview card.
- [x] Build platform badge.
- [x] Build quality selector.
- [x] Show analysis errors.

## Exit Criteria

Phase 2 is complete when:

- User can paste a YouTube link.
- App analyzes the link.
- App shows thumbnail, title, duration, and quality options.

---

# Phase 3 — Single Video Download

## Goal

Download one YouTube video with selected quality.

## Tasks

## Backend

- [ ] Add download job model.
- [ ] Add `/api/downloads` create endpoint.
- [ ] Build safe yt-dlp command arguments.
- [ ] Save file to default folder.
- [ ] Update job status.
- [ ] Handle download success.
- [ ] Handle download failure.
- [ ] Sanitize filenames.
- [ ] Add basic logs.

## Frontend

- [ ] Add Download button.
- [ ] Add download queue UI.
- [ ] Show pending status.
- [ ] Show downloading status.
- [ ] Show completed status.
- [ ] Show failed status.
- [ ] Add retry button.
- [ ] Add cancel button if possible.

## Exit Criteria

Phase 3 is complete when:

- User can choose a quality and download one video.
- App shows job status.
- File is saved locally.

---

# Phase 4 — Progress Tracking

## Goal

Show real-time download progress.

## Tasks

## Backend

- [ ] Parse yt-dlp progress output.
- [ ] Store job progress.
- [ ] Track percentage.
- [ ] Track speed where available.
- [ ] Track ETA where available.
- [ ] Add progress endpoint.
- [ ] Add WebSocket or Server-Sent Events.

## Frontend

- [ ] Build progress card.
- [ ] Show progress bar.
- [ ] Show percentage.
- [ ] Show speed.
- [ ] Show ETA.
- [ ] Show merging status.
- [ ] Show completed state.

## Exit Criteria

Phase 4 is complete when:

- User can see download progress clearly.
- Completed and failed states update correctly.

---

# Phase 5 — History and Settings

## Goal

Store download history and allow user preferences.

## Tasks

## History

- [ ] Create history database model.
- [ ] Save completed downloads.
- [ ] Save failed downloads.
- [ ] Add `/api/history`.
- [ ] Build history page.
- [ ] Add search.
- [ ] Add filters.
- [ ] Add open file/folder action.
- [ ] Add re-download action.

## Settings

- [ ] Create settings database model.
- [ ] Add `/api/settings`.
- [ ] Allow download folder change.
- [ ] Allow default quality change.
- [ ] Allow default audio format change.
- [ ] Allow theme change.
- [ ] Allow filename template change.
- [ ] Allow skip existing toggle.

## Exit Criteria

Phase 5 is complete when:

- Downloads are saved in history.
- Settings are saved locally.
- User can change default download folder.

---

# Phase 6 — Playlist Support

## Goal

Support full YouTube playlist downloads.

## Tasks

## Backend

- [ ] Detect playlist URLs.
- [ ] Extract playlist metadata.
- [ ] Extract playlist items.
- [ ] Create playlist database model.
- [ ] Create playlist item model.
- [ ] Support full playlist download.
- [ ] Support selected items.
- [ ] Support range downloads.
- [ ] Support skip existing.
- [ ] Save playlist in its own folder.
- [ ] Number playlist files by index.

## Frontend

- [ ] Build playlist summary card.
- [ ] Build playlist item list.
- [ ] Add select all.
- [ ] Add selected item download.
- [ ] Add range selector.
- [ ] Add skip existing toggle.
- [ ] Show playlist progress.

## Exit Criteria

Phase 6 is complete when:

- User can paste a YouTube playlist link.
- App shows playlist details.
- User can download the full playlist.
- Existing items can be skipped.

---

# Phase 7 — UI Polish

## Goal

Make the app feel clean, beautiful, and production-worthy.

## Tasks

- [ ] Apply final visual style.
- [ ] Improve spacing.
- [ ] Improve typography.
- [ ] Add empty states.
- [ ] Add friendly error states.
- [ ] Add dark mode.
- [ ] Add responsive mobile layout.
- [ ] Add subtle animations.
- [ ] Improve button states.
- [ ] Improve loading skeletons.
- [ ] Improve settings layout.

## Exit Criteria

Phase 7 is complete when:

- The app feels clean and polished.
- The mobile layout works well.
- The UI feels trustworthy.

---

# Phase 8 — Multi-Platform Expansion

## Goal

Add support for more platforms through adapters.

## Platform Order

Recommended order:

1. YouTube.
2. Vimeo.
3. Reddit.
4. TikTok.
5. X.com.
6. Instagram.
7. Facebook.
8. SoundCloud.

## Tasks

For each platform:

- [ ] Add adapter.
- [ ] Add platform detection.
- [ ] Add metadata extraction.
- [ ] Normalize formats.
- [ ] Test single download.
- [ ] Test audio-only if supported.
- [ ] Test error states.
- [ ] Add platform badge.
- [ ] Add platform-specific notes.

## Exit Criteria

Phase 8 is complete when:

- At least 3 non-YouTube platforms are supported cleanly.
- Platform logic remains isolated.
- Unsupported cases fail gracefully.

---

# Phase 9 — Desktop Packaging

## Goal

Package Nextract as a desktop app.

## Tasks

- [ ] Choose Tauri or Electron.
- [ ] Define packaging strategy.
- [ ] Bundle frontend.
- [ ] Bundle backend.
- [ ] Bundle or detect yt-dlp.
- [ ] Bundle or detect FFmpeg.
- [ ] Store local database properly.
- [ ] Test Linux.
- [ ] Test Windows.
- [ ] Test update process.

## Exit Criteria

Phase 9 is complete when:

- Nextract can run as a desktop app.
- User does not need to manually start frontend/backend.

---

# Phase 10 — Final Hardening

## Goal

Make the project stable and safe.

## Tasks

- [ ] Add tests.
- [ ] Add error logs.
- [ ] Add crash-safe job handling.
- [ ] Add file permission checks.
- [ ] Add storage checks.
- [ ] Add URL safety validation.
- [ ] Add rate/concurrency limits.
- [ ] Add docs for setup.
- [ ] Add docs for usage.
- [ ] Add release checklist.

## Exit Criteria

Phase 10 is complete when:

- The app is stable.
- Basic tests pass.
- Error handling is strong.
- Setup is documented.
- The project is ready for real usage.
