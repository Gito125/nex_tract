# Nextract Sidebar Footer Customization Log

**Date:** 14-06-2026  
**Author:** Antigravity AI  
**Topic:** Sidebar Bottom Customization (Adding Creator Profile)

## 1. Context & Request
The user requested to customize the bottom section of the sidebar in `web/components/layout/app-shell.tsx`. The previous implementation contained a placeholder "Help coming soon" button (disabled) and the `BackendHealthCard` (which hides when collapsed). The goal was to display the developer's personal info (Ogwang Gift Gideon / `@Gito125`) while keeping the visual layout cohesive and functional for a local-first side project. Additionally, the user requested fetching their GitHub profile picture directly, adding it on small screens (mobile headers), and implementing a highly custom premium fallback avatar.

---

## 2. Selected Design (Hybrid Option 1 + 3 & Mobile integration)
Following user feedback:
- **Backend Health Card:** Retained to provide active feedback on whether the local FastAPI backend is online or offline.
- **Creator Profile Button:** Replaced the placeholder help button with a custom interactive button that links to the developer's GitHub (`https://github.com/Gito125`).
- **GitHub Avatar Integration:** Created a robust `CreatorAvatar` component.
  - **Fetching:** Loads the profile image dynamically from `https://github.com/Gito125.png`.
  - **Graceful Fallback:** Implemented an `onError` trigger using React state that displays a premium custom fallback avatar.
- **Premium Fallback Design (Pro-Tool Aesthetic)**:
  - **Conic gradient ring**: Added a subtle halo arc at `-2px` inset to create depth without using heavy shadows (similar to high-end avatar systems like Vercel and Linear).
  - **OKLCH Color Palette**: Defined color sets (e.g., `indigo`, `teal`, `slate`) using perceptually uniform OKLCH space, offering exact contrast steps for background, border, and text.
  - **Monospace Typography**: Styled the initials in the fallback with a clean monospace font (`'Geist Mono'`, `'JetBrains Mono'`) for a terminal-like, intentional look suited for a media archiver tool.
- **Small Screens / Mobile Header Support:**
  - Modified the mobile `<header>` layout (`display: flex`, `justify-content: space-between`).
  - Rendered a `30px` interactive version of the `CreatorAvatar` on the right side of the mobile header, linking directly to the developer's GitHub profile.
- **Desktop Transitions:** Fully responsive to the sidebar's collapse state. When collapsed, the text labels transition to `width: 0` and `opacity: 0` while the avatar circle remains perfectly centered in the sidebar as an interactive element. Hovering over the collapsed avatar displays the tooltip: `Built with ❤️ by Ogwang Gift Gideon`.

---

## 3. Files Modified
- [app-shell.tsx](file:///home/gideon/Documents/CODE/Projects/nex_tract/web/components/layout/app-shell.tsx):
  - Removed unused `HelpCircle` icon import.
  - Added reusable `CreatorAvatar` component with oklch / conic fallback state.
  - Added `CreatorProfileBtn` component utilizing the `CreatorAvatar`.
  - Updated the desktop sidebar footer to use the custom profile button.
  - Redesigned the mobile header to show the avatar aligned to the right side.


