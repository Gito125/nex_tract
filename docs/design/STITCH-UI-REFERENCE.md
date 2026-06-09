# Stitch UI Reference

This document distills the useful UI direction from `/home/gideon/Downloads/stitch_project_title_generator`. The Stitch HTML is not source code for this repo. Treat it as visual reference only.

Screenshots are copied into [docs/design/stitch](stitch/) for durable comparison.

## Canonical Patterns

- Desktop layout uses a fixed left sidebar with the Nextract wordmark, "Personal Archive" subtitle, primary navigation, and secondary help/logout actions at the bottom.
- Mobile layout uses a compact top bar and bottom navigation. Avoid forcing the desktop sidebar onto small screens.
- Home/paste flow is centered around one oversized URL input and a strong "Analyze Link" action.
- Media preview shows a clear back action, 16:9 thumbnail, title, source/channel metadata, platform badge, quality pills, and primary download action.
- Queue uses dense horizontal transfer cards with thumbnail/icon, title, status badge, progress bar, metadata, pause/cancel/retry/open-folder actions, and clear failed/completed states.
- History uses searchable, filterable archive cards with thumbnails, platform badges, quality/file metadata, open-folder action, and re-download action.
- Legal/permission copy stays visible but quiet: users should only download and store media they have the right to keep.

## Screen Notes

### Home

- Desktop: large centered headline, paste field, integrated Analyze button, supported platform indicator, and quiet permission footer.
- Mobile: top nav, stacked paste input and Analyze button, compact supported platform section.
- Keep the first screen focused on the paste action. Do not front-load settings or advanced options.

### Media Preview

- Use a single preview surface with thumbnail and metadata grouped together.
- Quality options are pills. The selected quality uses the primary color; inactive options use neutral surfaces.
- Audio-only options should be visually equal to video quality choices, not hidden behind advanced settings.
- Show uncertainty copy below the card when file size or final quality may vary.

### Download Queue

- Use status-specific treatments without making the screen noisy:
  - downloading: primary progress
  - analyzing/merging: secondary or indeterminate progress
  - failed: error tint plus retry action
  - completed: success progress plus open-folder action
- Progress data such as speed, percent, and ETA should use tabular or monospaced numerals where useful.
- Keep queue cards scannable and left-aligned.

### History

- Treat history as the user's vault.
- Provide search and platform filter controls at the top.
- Use card or row layouts that show title, date, file size, platform, quality, and available actions.
- MVP history should not imply implemented non-YouTube platform support; non-YouTube badges in reference screenshots are visual examples only.

## Design Integration

The Stitch export matches the Nextract "Functional Serenity" direction:

- soft off-white background
- white and low-contrast surface containers
- deep indigo primary actions
- quiet technical metadata
- rounded cards, buttons, badges, and pills
- restrained shadows and hairline borders

When building UI, use this reference together with [DESIGN.md](DESIGN.md), not as a replacement for the design system.

## Anti-Patterns To Avoid

- Do not copy generated Stitch HTML into the app.
- Do not import remote placeholder images from the Stitch export.
- Do not imply TikTok, Instagram, X/Twitter, or other platforms are implemented in MVP screens.
- Do not use gradient text, decorative glow, nested cards, or decorative motion that does not clarify state or flow.
