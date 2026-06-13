/**
 * Runtime environment detection for Tauri vs browser contexts.
 */

/** Returns true when running inside the Tauri desktop shell. */
export function isTauri(): boolean {
  if (typeof window === "undefined") return false;
  const win = window as unknown as { __TAURI__?: unknown; __TAURI_INTERNALS__?: unknown };
  return (
    Boolean(win.__TAURI__) ||
    Boolean(win.__TAURI_INTERNALS__) ||
    window.location.protocol === "tauri:" ||
    window.location.hostname === "tauri.localhost"
  );
}
