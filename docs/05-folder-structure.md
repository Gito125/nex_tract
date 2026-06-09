# 05 — Nextract Folder Structure

This document defines the recommended folder structure for the Nextract project.

The goal is to keep the project clean, scalable, and easy to understand.

## Full Project Structure

```txt
nextract/
  README.md
  .gitignore
  .env.example

  docs/
    01-vision.md
    02-mini-srs.md
    03-architecture.md
    04-design.md
    05-folder-structure.md
    PROGRESS.md

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

    package.json
    next.config.ts
    tailwind.config.ts
    tsconfig.json

  server/
    pyproject.toml
    uv.lock
    .python-version

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
      test_filename.py

  data/
    nextract.db

  downloads/
    Nextract/
      YouTube/
        Single Videos/
        Playlists/
      TikTok/
      Instagram/
      X/
      Reddit/
      Vimeo/

  scripts/
    dev.sh
    dev.ps1
    setup.sh
    setup.ps1
```

## Why This Structure Works

## 1. Clear separation

The frontend and backend are separate:

```txt
web/
server/
```

This prevents frontend code and backend code from becoming mixed.

## 2. Documentation stays visible

The docs folder is at the root:

```txt
docs/
```

This makes planning easy to find.

## 3. Backend is service-based

Backend logic is split into services:

```txt
services/
```

This avoids putting all logic inside API route files.

## 4. Platform support is isolated

Each platform gets its own adapter:

```txt
platforms/
```

This makes future expansion cleaner.

## 5. Downloads are organized

Default download storage:

```txt
downloads/Nextract/
```

Each platform gets its own folder.

## 6. Local data is separate

The SQLite database lives in:

```txt
data/nextract.db
```

This keeps app data separate from source code.

## First Directories to Create

Start with this minimum:

```txt
nextract/
  README.md
  docs/
  web/
  server/
  data/
  downloads/
```

Then expand as features are built.
