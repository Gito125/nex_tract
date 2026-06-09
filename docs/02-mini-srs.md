# 02 — Nextract Mini Software Requirements Specification

## 1. Purpose

This document defines the core software requirements for **Nextract**, a local-first media extraction and downloading app.

The app will be built with:

- Next.js frontend.
- Python FastAPI backend.
- uv for Python project management.
- yt-dlp as the downloader engine.
- FFmpeg for merging and conversion.
- SQLite for the local-first MVP database.

## 2. Scope

### 2.1 Initial Scope

The initial version focuses on YouTube.

The MVP must support:

- Single YouTube video downloads.
- YouTube playlist downloads.
- Video quality selection.
- Audio-only downloads.
- Download queue.
- Progress tracking.
- Download history.
- Local settings.
- Clean responsive UI.

### 2.2 Future Scope

Future versions may support:

- TikTok.
- Instagram.
- X.com.
- Facebook.
- Reddit.
- Vimeo.
- SoundCloud.
- Other supported public media platforms.

Each platform must be added through a clean adapter system.

## 3. Product Constraints

Nextract must follow these constraints:

- The app should be local-first before becoming public.
- The backend must use Python.
- Python dependencies and commands must be managed with uv.
- The frontend should use Next.js.
- The app should use yt-dlp where appropriate.
- FFmpeg should be available for merging video/audio and conversion.
- The app must not support DRM bypassing.
- The app must not bypass paywalls.
- The app must not scrape private accounts.
- The app must not be marketed as a piracy tool.

## 4. Legal and Ethical Requirements

Nextract must communicate that users should only download content they are allowed to keep.

The app should use safe wording such as:

```txt
Download only media you own, have permission to save, or are legally allowed to archive.
```

The app should avoid wording such as:

```txt
Download any video for free.
Bypass restrictions.
Save private videos.
Download paid content.
```

## 5. Functional Requirements

## FR-001 — Paste Link

The user must be able to paste a media URL into the app.

The input must:

- Accept one URL at a time in the MVP.
- Validate basic URL format.
- Detect unsupported links.
- Show helpful errors.
- Support quick paste behavior where possible.

## FR-002 — Analyze Link

The app must analyze the pasted link before downloading.

The analysis result should include:

- Platform.
- Media type.
- Title.
- Thumbnail.
- Duration.
- Creator/channel if available.
- Available quality options.
- Available audio options.
- Playlist information if applicable.

## FR-003 — Media Preview

The app must show a preview before download.

The preview should include:

- Thumbnail.
- Title.
- Duration.
- Platform badge.
- Creator/channel if available.
- Quality selector.
- Audio-only selector.
- Download button.
- Advanced options toggle.

## FR-004 — Quality Selection

The user must be able to select a quality.

Basic options:

- Best quality.
- 1080p.
- 720p.
- 480p.
- 360p.
- Audio only.

The app should only show qualities that are available or clearly explain when a selected quality cannot be found.

## FR-005 — Audio Downloads

The user must be able to download audio-only media.

Supported audio output options:

- M4A.
- MP3.
- OPUS.

MP3 conversion may require FFmpeg.

## FR-006 — Playlist Downloads

The app must support playlist downloads.

Playlist features:

- Download full playlist.
- Download selected videos.
- Download by range.
- Skip already downloaded items.
- Save playlist in its own folder.
- Number files by playlist order.

## FR-007 — Download Queue

The app must include a download queue.

Each job should show:

- Title.
- Platform.
- Status.
- Progress percentage.
- Download speed if available.
- ETA if available.
- Current file name.
- Cancel action.
- Retry action for failed jobs.

Pause support can be added later.

## FR-008 — Download History

The app must save download history.

History should show:

- Title.
- URL.
- Platform.
- Download date.
- Selected quality.
- Output path.
- Status.
- File size if available.
- Open file/folder action.
- Re-download action.

## FR-009 — Settings

The app must include settings for:

- Default download folder.
- Default video quality.
- Default audio format.
- Theme.
- Filename template.
- Playlist folder behavior.
- Maximum parallel downloads.
- Save thumbnails.
- Save subtitles where available.
- Skip existing downloads.

## FR-010 — Error Handling

The app must show friendly error messages.

Error examples:

- Invalid URL.
- Unsupported platform.
- Media unavailable.
- Private/restricted content.
- FFmpeg missing.
- yt-dlp error.
- Network failure.
- Permission denied.
- Not enough storage.
- Download cancelled.
- Format unavailable.

Errors should be readable by normal users while keeping detailed logs available for debugging.

## FR-011 — Platform Detection

The app must detect the platform from the URL.

Initial platform:

- YouTube.

Future platforms:

- TikTok.
- Instagram.
- X.com.
- Facebook.
- Reddit.
- Vimeo.
- SoundCloud.

## FR-012 — File Organization

Downloaded files should be organized clearly.

Default structure:

```txt
Downloads/
  Nextract/
    YouTube/
      Single Videos/
      Playlists/
    TikTok/
    Instagram/
    X/
```

Users should be able to change the root download folder.

## 6. Non-Functional Requirements

## NFR-001 — Simplicity

The UI must be simple enough for a non-technical user.

## NFR-002 — Beauty

The app should look clean, modern, and polished.

## NFR-003 — Performance

URL analysis should provide loading feedback.

Downloads should not freeze the UI.

## NFR-004 — Reliability

Failed downloads should not crash the app.

Users should be able to retry failed downloads.

## NFR-005 — Privacy

The first version should run locally and should not upload user links or downloaded files to external servers.

## NFR-006 — Maintainability

Each platform should be added through an adapter system.

## NFR-007 — Security

The backend must avoid command injection.

The backend should not execute raw shell commands built from user input.

Use controlled argument lists when calling yt-dlp.

## NFR-008 — Responsiveness

The frontend must work well on:

- Desktop.
- Laptop.
- Tablet.
- Mobile browser.

## 7. User Flows

## Flow 1 — Single Video Download

1. User opens Nextract.
2. User pastes a YouTube video link.
3. User clicks Analyze.
4. App shows media preview.
5. User selects quality.
6. User clicks Download.
7. App shows progress.
8. File is saved.
9. Download appears in history.

## Flow 2 — Audio-Only Download

1. User pastes media link.
2. App analyzes link.
3. User chooses Audio Only.
4. User selects MP3 or M4A.
5. App downloads and converts if required.
6. Audio file is saved.

## Flow 3 — Playlist Download

1. User pastes playlist link.
2. App detects playlist.
3. App shows playlist details.
4. User chooses full playlist or selected items.
5. User selects quality.
6. App downloads each item.
7. Existing items are skipped if enabled.
8. Playlist appears in history.

## Flow 4 — Failed Download

1. Download fails.
2. App shows friendly reason.
3. User clicks Retry.
4. App attempts download again.
5. If it fails again, detailed error is stored for debugging.

## 8. MVP Completion Criteria

The MVP is complete when Nextract can:

- Analyze a YouTube video URL.
- Show a media preview.
- Show quality options.
- Download selected video quality.
- Download audio-only.
- Analyze a YouTube playlist.
- Download full playlist.
- Show progress.
- Save history.
- Allow changing download folder.

## 9. Out of Scope for MVP

The MVP will not include:

- Public SaaS hosting.
- User accounts.
- Payments.
- Mobile app store release.
- Browser extension.
- DRM bypassing.
- Private account download.
- Advanced video editing.
- Scheduled downloads.
- Cloud sync.
