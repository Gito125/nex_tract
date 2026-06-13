/**
 * Runtime environment detection for Tauri vs browser contexts.
 */

/** Returns true when running inside the Tauri desktop shell. */
export function isTauri(): boolean {
  return (
    typeof window !== "undefined" &&
    (Boolean((window as any).__TAURI__) ||
      Boolean((window as any).__TAURI_INTERNALS__) ||
      window.location.protocol === "tauri:" ||
      window.location.hostname === "tauri.localhost")
  );
}
