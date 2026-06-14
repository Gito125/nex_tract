# AI Context

This is the reading map for agents and Copilot working on Nextract. Keep entrypoint files minimal and put durable project context here.

## Start Here

Read these first for normal implementation work:

1. [01 - Vision](../01-vision.md) for product intent, audience, positioning, and ethical boundaries.
2. [02 - Mini SRS](../02-mini-srs.md) for functional requirements and MVP completion criteria.
3. [03 - Architecture](../03-architecture.md) for stack, service boundaries, API shape, data model, and build order.
4. [Core Commands](../CORE-COMMANDS.md) for local development commands.
5. [04 - Design Summary](../04-design.md) for quick UI direction.

Use [docs/design/DESIGN.md](../design/DESIGN.md) when choosing exact design tokens, component states, layout rules, and visual behavior.

Use [docs/context/ENGINEERING-GUIDE.md](ENGINEERING-GUIDE.md) for day-to-day code generation rules.

## Current Product Scope

Nextract is a local-first media extraction and archiving app.

Primary flow:

```txt
Paste URL -> Analyze -> Choose Quality -> Download -> Organized file saved
```

MVP scope is YouTube only:

- single videos
- playlists
- audio-only downloads
- download queue
- history
- settings

Do not implement multi-platform support, authentication, cloud sync, desktop packaging, browser extension, scheduled downloads, or media playback unless the current project docs move those items into active scope.

## Safety Boundaries

Nextract must not be framed or implemented as a piracy, DRM bypass, paywall bypass, private account scraping, or restriction-circumvention tool.

Prefer user-friendly errors and clear permission-oriented copy. Never expose secrets, tokens, credentials, private user data, or raw internal tracebacks in generated docs, UI copy, or API responses.

When done, make a simple log in `docs/logs/DD-MM-YYYY.md` describing the change, the reasoning, and any relevant context. This will help future agents understand the history of decisions and changes.

## Context Precedence

1. Active user request.
2. Repo-local docs and source code.
3. Project-level agent instructions.

When these conflict on implementation details, the repository docs and source code win.
