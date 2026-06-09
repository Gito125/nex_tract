---
name: Nextract
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#464555'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#00687a'
  on-secondary: '#ffffff'
  secondary-container: '#57dffe'
  on-secondary-container: '#006172'
  tertiary: '#7e3000'
  on-tertiary: '#ffffff'
  tertiary-container: '#a44100'
  on-tertiary-container: '#ffd2be'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#acedff'
  secondary-fixed-dim: '#4cd7f6'
  on-secondary-fixed: '#001f26'
  on-secondary-fixed-variant: '#004e5c'
  tertiary-fixed: '#ffdbcc'
  tertiary-fixed-dim: '#ffb695'
  on-tertiary-fixed: '#351000'
  on-tertiary-fixed-variant: '#7b2f00'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
  charcoal-text: '#1F2937'
  surface-white: '#FFFFFF'
  dark-bg: '#0F172A'
  dark-surface: '#1E293B'
  success-green: '#10B981'
  warning-amber: '#F59E0B'
  error-red: '#EF4444'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  headline-md-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1200px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style

The design system is built on the principle of **Functional Serenity**. It positions the utility as a high-end personal archive tool rather than a transient downloader. The brand personality is professional, disciplined, and transparent, evoking a sense of digital craftsmanship.

For meaningful UI work, use the `impeccable` and `frontend-design` skills when available. They should be applied to make the interface feel deliberate, polished, responsive, and production-grade without drifting away from Nextract's calm local-first product identity.

### Design Style: Corporate Modern / Minimalist
The aesthetic leverages a structured, card-based layout with a focus on deep, sophisticated tones and expansive whitespace. It avoids the cluttered "sketchy" tropes of web-based converters by utilizing:
- **Spacious Breathability:** Generous margins and internal padding to reduce cognitive load.
- **Subtle Layering:** Using tonal changes rather than heavy shadows to denote hierarchy.
- **Technical Precision:** Clean iconography and data-dense but readable tables for download history and settings.
- **Trust-First UI:** Clear labeling, ethical disclaimers, and visible progress indicators that make the underlying technical processes feel safe and controlled.

Avoid generic AI UI tells: gradient-filled text, decorative glow, nested cards, noisy palettes, fake glass, and motion that does not clarify state or flow.

## Colors

The color palette is designed to transition seamlessly between a focused, productive light mode and a deep, immersive dark mode.

### Light Mode
- **Background:** `#F9FAFB` (Soft off-white) to reduce glare and differentiate from pure white surfaces.
- **Surface:** `#FFFFFF` (White) used for cards and interactive components to create elevation.
- **Primary:** `#4F46E5` (Deep Indigo) for main actions and branding.
- **Text:** `#1F2937` (Charcoal) for high-contrast readability.

### Dark Mode
- **Background:** `#0F172A` (Deep Navy) providing a sophisticated, "pro-tool" environment.
- **Surface:** `#1E293B` (Muted Slate) for cards to provide subtle contrast against the background.
- **Accents:** Use secondary Cyan (`#06B6D4`) and Primary Indigo for interactive elements to maintain high visibility.

### Functional Colors
- **Success/Warning/Error:** Used sparingly for status badges and progress states to ensure the user is always informed of the app's internal status.

## Typography

The typography system uses **Inter** exclusively to emphasize the app's utility and "software-first" nature.

Inter is a deliberate product-font choice for Nextract and is an explicit exception to general design-skill guidance that discourages default or common fonts.

### Hierarchy Rules
- **Display & Headlines:** Use tighter letter spacing and heavier weights to create a sense of authority and modernity.
- **Body:** Standard weight with generous line height to ensure descriptions and metadata are easily scannable.
- **Labels:** Used for metadata (file size, duration, quality). Small labels should use a slightly heavier weight (`500` or `600`) to remain legible at small scales.
- **Numerical Data:** Monospaced variants (if available in the font stack) should be used for progress percentages and file sizes to prevent layout jitter during active downloads.

## Layout & Spacing

This design system employs a **Fixed-Fluid Hybrid Grid**. Content is housed in a central container with a maximum width of 1200px to ensure legibility on ultra-wide monitors, while fluidly scaling down for tablets and mobile.

### Grid System
- **Desktop:** 12-column grid with 24px gutters. Media cards usually span 3 or 4 columns.
- **Mobile:** Single column with 16px side margins.
- **Rhythm:** All spacing (padding, margins, gaps) must be multiples of the **8px base unit**.

### Application
- Use `spacing-6` (48px) for vertical section gaps.
- Use `spacing-3` (24px) for internal card padding.
- Centered layout is preferred for the Home/Paste screen to focus the user’s intent, while the History and Queue screens should use a left-aligned, data-optimized layout.

## Elevation & Depth

Hierarchy is established through **Tonal Layering** and soft, ambient shadows rather than harsh borders.

### Elevation Levels
- **Level 0 (Background):** Neutral base (`#F9FAFB` or `#0F172A`).
- **Level 1 (Cards/Surfaces):** White or Navy-Slate surfaces. These should have a very soft, diffused shadow: `0px 4px 20px rgba(0, 0, 0, 0.05)`.
- **Level 2 (Modals/Dropdowns):** Elevated surfaces with a more pronounced shadow to indicate focus: `0px 10px 30px rgba(0, 0, 0, 0.1)`.

### Borders
Instead of high-contrast borders, use a 1px subtle stroke (`#E5E7EB` in light mode, `#334155` in dark mode) to define card boundaries. This creates a "hairline" finish that feels premium and precise.

## Shapes

The shape language is "Soft-Modern," utilizing significant rounding to feel approachable and friendly.

- **Main Cards:** 16px (rounded-lg) for large layout blocks and media previews.
- **Buttons & Inputs:** 8px (rounded-md) to provide a distinct look from the background cards.
- **Badges/Pills:** Fully rounded (pill-shaped) for platform tags (YouTube, TikTok) and quality selection (1080p, MP3).
- **Interactive States:** On hover, cards may subtly lift (increased shadow) or show a primary-colored border-glow to indicate clickability.

## Components

### Buttons
- **Primary:** Solid Deep Indigo with white text. High-contrast, used for "Analyze" and "Download."
- **Secondary:** Ghost style (outline or subtle tint) for "View Downloads" or "Advanced Options."
- **States:** Hover should darken the background color by 10%; Active should scale the button down to 98% for a tactile feel.

### Input Fields (The "URL Paste" Area)
- The primary URL input should be oversized (height: 64px) with a prominent "Paste" icon and a large, integrated "Analyze" button on the trailing edge.
- Use a focus ring of 3px primary color with 20% opacity.

### Media Preview Cards
- **Structure:** Thumbnail (16:9 aspect ratio) on the left or top, followed by Title, Metadata (duration, platform), and the Quality Selector.
- **Quality Selector:** A horizontal scroll or wrap-list of "pills." The active selection should have a primary background; inactive options should be subtle light-gray/slate.

### Progress Bars
- Height: 8px.
- Background: Neutral-200; Fill: Primary Indigo.
- For "Merging" or "Analyzing" states, use an indeterminate animated pulse.

### Status Badges
- Small, uppercase labels with a subtle background tint (e.g., Success is light green background with dark green text).
- Placement: Top right of media cards or within history tables.

## Stitch Reference

Use [STITCH-UI-REFERENCE.md](STITCH-UI-REFERENCE.md) and the screenshots in [stitch/](stitch/) as visual reference for screen composition. The Stitch HTML is not source code and should not be copied into the app.
