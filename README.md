# Nextract

**Nextract** is a clean, local-first media extraction and downloading app.

The name comes from **Nexus + Extract**:
- **Nexus**: a connection point between platforms, media, and the user.
- **Extract**: pulling allowed media into an organized personal vault.

Nextract starts as a YouTube downloader with support for video qualities, audio-only downloads, and full playlists. It later grows into a broader social media downloader for supported platforms such as TikTok, Instagram, X.com, Facebook, Reddit, Vimeo, and others where technically and legally appropriate.

## Core Principle

Nextract should feel like a polished productivity tool, not a suspicious downloader website.

The experience should be:

```txt
Paste link → Analyze → Choose quality → Download → Organize
```

## Tech Direction

- Frontend: Next.js
- Backend: Python FastAPI
- Python project manager: uv
- Downloader engine: yt-dlp
- Media processing: FFmpeg
- Database: SQLite for local-first MVP
- Future desktop packaging: Tauri or Electron

## Project Structure

```txt
nextract/
  web/        Next.js frontend
  server/     FastAPI backend
  downloads/  saved media files
  data/       SQLite database
```

## Documentation Files

```txt
docs/
  01-vision.md
  02-mini-srs.md
  03-architecture.md
  04-design.md
  05-folder-structure.md
  PROGRESS.md
```

## MVP Target

The first working version should allow the user to:

1. Paste a YouTube video link.
2. Analyze the link.
3. Preview the media.
4. Choose a quality.
5. Download the video.
6. Paste a YouTube playlist link.
7. Download the playlist.
8. Track progress.
9. View download history.
10. Change the download folder.

## Product Boundary

Nextract is for downloading media the user owns, has permission to download, or is legally allowed to save.

It must not be designed for DRM bypassing, piracy, private account scraping, paywall bypassing, or unauthorized downloading.
