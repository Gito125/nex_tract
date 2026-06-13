# Nextract Frontend (Next.js)

This directory contains the user interface for Nextract, built with [Next.js](https://nextjs.org/) (App Router), React, and Tailwind CSS. 

## 🏗️ Architecture & Tauri Integration

Because Nextract is distributed as a local desktop application via [Tauri](https://tauri.app/), this Next.js project is configured for **Static HTML Export**.

### Static Export Limitations & Solutions
When Next.js runs in `output: 'export'` mode, it generates pure HTML/JS/CSS assets without a Node.js server. These assets are bundled directly into the Tauri WebView.

- **No SSR/API Routes**: Server-side rendering and Next.js API routes are not available. All data fetching is routed directly to the Python FastAPI backend.
- **Dynamic Port Resolution**: The frontend cannot hardcode the API URL to `localhost` because the port might vary. The API base URL is resolved dynamically at runtime by checking for the `window.__TAURI__` object (see `lib/api.ts`), ensuring it correctly targets the backend sidecar (usually `http://127.0.0.1:57000`).
- **Unoptimized Images**: The Next.js `<Image>` component is configured with `unoptimized: true` in `next.config.ts`, as the default image optimization API relies on a Node.js runtime.

## 🚀 Development Commands

This project uses `pnpm`.

```bash
# Install dependencies
pnpm install

# Run the standalone web dev server (Expects backend to be running separately)
pnpm dev

# Build for static export (Outputs to /web/out)
pnpm build
```

*(Note: In most cases, you should use the root development scripts like `scripts/dev.sh` to spin up both the frontend and backend together.)*