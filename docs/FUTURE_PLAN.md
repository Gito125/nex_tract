# Future Plan

This document exists to capture future ideas, architecture directions, and long-term possibilities for Nextract so they are not lost while building the MVP.

It is not a task list.
It should not drive current implementation.
Nothing in this file should be implemented unless explicitly requested.

If anything here conflicts with MVP progress, the MVP wins.

---

# Future Vision

Nextract is intended to grow into a long-term personal media extraction and archiving platform. It begins as a local-first YouTube downloader focused on reliability, clarity, and user control, but the broader vision is a system that helps users collect, organize, and preserve online media they care about.

Over time, Nextract may expand beyond YouTube through a clean adapter architecture. Each supported platform should remain isolated behind clear interfaces so the system can grow without turning into a tightly coupled collection of platform-specific logic.

---

# Future Deployment Models

## Local Web App

Current approach:

- Next.js frontend
- FastAPI backend
- uv
- yt-dlp
- FFmpeg
- SQLite

Everything runs locally.

## Desktop Application

Potential future:

- Tauri desktop application
- Windows support
- Linux support
- macOS support
- Native installers
- Bundled yt-dlp
- Bundled FFmpeg
- Bundled backend

Benefits:

- Downloads remain on the user's machine.
- No server bandwidth costs.
- Better legal and operational position.
- Native desktop experience.

## Browser Extension

Potential future:

- Browser extension companion.
- Download actions directly from supported sites.
- Integration with local Nextract desktop app.

---

# Future Cloud Features

Potential cloud features should focus on metadata, not media storage.

Examples:

- User accounts.
- Download history sync.
- Settings sync.
- Playlist sync.
- Device sync.
- Preferences backup.

Important:

Cloud services should not store downloaded media files unless a future business model explicitly requires it.

---

# Future Desktop Agent Architecture

Documented future possibility:

```txt
Cloud Dashboard
    ↓
Desktop Agent
    ↓
yt-dlp
    ↓
Local Downloads
```

In this model, the cloud manages metadata, coordination, and user-facing account features, while the desktop agent performs downloads locally on the user's machine.

---

# Future Platform Expansion

Potential supported platforms:

- YouTube
- Vimeo
- Reddit
- TikTok
- X.com
- Instagram
- Facebook
- SoundCloud

Each platform should be implemented through isolated adapters.

---

# Future Advanced Features

Possible future features:

- Subtitle manager
- Metadata export
- Download scheduling
- Channel backup
- Playlist backup
- Media library
- Duplicate detection
- Search across downloaded media
- Smart organization
- Media tagging
- Bulk downloads

---

# Future Business Ideas

Possible monetization ideas, documented only for future consideration:

- Pro desktop version
- Cloud sync subscription
- Creator backup tools
- Team media archiving tools
- Enterprise knowledge archiving

---

# Guiding Principle

Nextract should remain:

- Clean
- Local-first
- Privacy-friendly
- User-controlled
- Well-architected

The MVP goal is still:

`Paste URL -> Analyze -> Choose Quality -> Download`

Anything that does not directly help achieve the MVP should be deferred to the future.
