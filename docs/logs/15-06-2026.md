# Developer Log: PWA & Hugging Face Deployment Setup (15-06-2026)

## Overview
Based on [docs/pwa-and-hosting-plan.md](file:///home/gideon/Documents/CODE/Projects/nex_tract/docs/pwa-and-hosting-plan.md), configured the frontend as a fully installable Progressive Web App (PWA) and prepared the backend directory for Docker deployment to Hugging Face Spaces.

## Changes

### 1. Frontend PWA Integration
- Installed `@ducanh2912/next-pwa` dependency in the `@nextract/web` package.
- Wrapped the Next.js configuration in [web/next.config.ts](file:///home/gideon/Documents/CODE/Projects/nex_tract/web/next.config.ts) with `withPWA` wrapper.
- Created [web/public/manifest.json](file:///home/gideon/Documents/CODE/Projects/nex_tract/web/public/manifest.json) detailing the app title, theme colors, and icons.
- Updated root metadata in [web/app/layout.tsx](file:///home/gideon/Documents/CODE/Projects/nex_tract/web/app/layout.tsx) to link the manifest file and configure iOS apple-mobile-web-app-capable settings.

### 2. Backend Hugging Face Preparation
- Created [server/Dockerfile](file:///home/gideon/Documents/CODE/Projects/nex_tract/server/Dockerfile) for compiling system dependencies (FFmpeg), installing the `uv` package manager, and running the FastAPI server.
- Prepend the required Hugging Face Space YAML frontmatter to [server/README.md](file:///home/gideon/Documents/CODE/Projects/nex_tract/server/README.md) defining the Docker SDK, app port (7860), and basic space details.

## Verification
- Installed packages successfully.
- Verified configuration formats.
- Ready for frontend Vercel deployment and Hugging Face space creation.

### 3. Settings Parsing Bug Fix
- Fixed a crash on Hugging Face Spaces startup where `pydantic-settings` failed to parse the comma-separated string `NEXTRACT_CORS_ORIGINS` (raised `SettingsError` expecting JSON array).
- Added `NoDecode` annotation from `pydantic_settings` to `cors_origins` in [server/app/core/config.py](file:///home/gideon/Documents/CODE/Projects/nex_tract/server/app/core/config.py) to skip automatic JSON decoding.
- Updated the custom validator to handle both trailing-slash and non-trailing-slash versions of CORS domains seamlessly, ensuring full compatibility with Vercel origins without affecting local or desktop tauri settings.
