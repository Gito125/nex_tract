# 04 - Nextract Design Summary

This document summarizes the full design system in [docs/design/DESIGN.md](design/DESIGN.md). Use this file for quick product and implementation direction. Use the full design document when choosing exact tokens, component states, and detailed layout rules.

## Design Principle

Nextract should feel like a polished local-first productivity tool, not a disposable downloader site. The design direction is **Functional Serenity**: calm, structured, trustworthy, and technically precise.

For meaningful UI work, use the `impeccable` and `frontend-design` skills when available. They should strengthen the visual point of view, interaction quality, responsive behavior, and final polish while preserving this product direction.

## Visual Style

- Corporate modern and minimalist.
- Spacious layouts with clear visual hierarchy.
- Card-based surfaces for previews, queue items, history, and settings.
- Subtle tonal layering instead of heavy shadows.
- Transparent progress and status indicators so downloads feel controlled.
- Avoid generic AI UI tells: gradient text, decorative glow, nested cards, noisy palettes, and meaningless motion.

See [Brand & Style](design/DESIGN.md#brand--style) for the full positioning notes.

## Color Direction

The palette supports both a focused light mode and a pro-tool dark mode.

- Light background: soft off-white.
- Light surfaces: white cards and controls.
- Primary action: deep indigo.
- Text: charcoal for strong readability.
- Dark background: deep navy.
- Dark surfaces: muted slate.
- Functional colors: success, warning, and error only where status needs to be clear.

Exact token values are defined in [docs/design/DESIGN.md](design/DESIGN.md#colors).

## Typography

Use Inter as the product font. Headings should feel confident and restrained. Body copy should prioritize scannability. Metadata such as file size, duration, speed, ETA, and percentages should use clear label styling, with monospaced numerals where useful to avoid jitter.

Inter is an intentional Nextract product decision. It is an explicit exception to general design-skill advice against default font choices.

See [Typography](design/DESIGN.md#typography) for the full scale.

## Layout

Use a fixed-fluid layout:

- Max content width: 1200px.
- Desktop: 12-column grid with 24px gutters.
- Mobile: single column with 16px margins.
- Spacing should follow an 8px base unit.

Home and paste/analyze flows should be centered around the user's immediate action. Queue, history, and settings screens should be denser and left-aligned for scanning.

See [Layout & Spacing](design/DESIGN.md#layout--spacing).

## Core UI Components

The MVP interface should prioritize:

- URL paste and analyze input.
- Media preview card.
- Quality selector.
- Download queue and progress cards.
- Status badges.
- History list.
- Settings sections.

Detailed component behavior is in [Components](design/DESIGN.md#components).

Use the Stitch-derived visual reference in [docs/design/STITCH-UI-REFERENCE.md](design/STITCH-UI-REFERENCE.md) for screen composition patterns.

## App Structure Alignment

The product structure should reflect the project structure:

```txt
nextract/
  web/        # Next.js frontend
  server/     # FastAPI backend
  downloads/  # saved media files
  data/       # SQLite database
```

The frontend in `web/` owns the user experience described here. The backend in `server/` owns analysis, downloads, persistence, and filesystem operations.
