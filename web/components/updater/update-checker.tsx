"use client";

import { useEffect, useState } from "react";
import { ArrowDownToLine, X, SkipForward, Clock, Download, ExternalLink, RefreshCw } from "lucide-react";

import { isTauri } from "@/lib/env";
import { isVersionSkipped, skipVersion } from "@/lib/updater";

type UpdateState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "available"; version: string; notes: string; canAutoUpdate: true; update: unknown }
  | { status: "available-manual"; version: string; notes: string; url: string }
  | { status: "downloading"; version: string; progress: number }
  | { status: "ready"; version: string }
  | { status: "error"; message: string }
  | { status: "dismissed" };

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";

export function UpdateChecker() {
  const [state, setState] = useState<UpdateState>({ status: "idle" });

  async function checkForUpdates() {
    setState({ status: "checking" });

    try {
      // Try Tauri's built-in updater first (works for NSIS, AppImage, DMG)
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();

      if (update) {
        if (isVersionSkipped(update.version)) {
          setState({ status: "dismissed" });
          return;
        }
        setState({
          status: "available",
          version: update.version,
          notes: update.body ?? "",
          canAutoUpdate: true,
          update,
        });
        return;
      }
    } catch {
      // Updater plugin not available or no compatible update — fall through to GitHub check
    }

    // Fallback: check GitHub releases API (for deb/rpm or when updater has no entry)
    try {
      const { checkGitHubRelease, isNewerVersion } = await import("@/lib/updater");
      const release = await checkGitHubRelease();

      if (release) {
        const remoteVersion = release.tag_name.replace(/^v/, "");
        if (isNewerVersion(APP_VERSION, remoteVersion) && !isVersionSkipped(remoteVersion)) {
          setState({
            status: "available-manual",
            version: remoteVersion,
            notes: release.body ?? "",
            url: release.html_url,
          });
          return;
        }
      }
    } catch {
      // Network error — silently ignore
    }

    setState({ status: "dismissed" });
  }

  useEffect(() => {
    if (!isTauri()) return;

    // Delay check slightly so the app loads first
    const timer = setTimeout(() => checkForUpdates(), 3000);
    return () => clearTimeout(timer);
  }, []);

  async function handleUpdate() {
    if (state.status !== "available") return;

    const update = state.update as {
      downloadAndInstall: (onProgress?: (progress: { fraction: number | null; contentLength: number | null }) => void) => Promise<void>;
    };

    setState({ status: "downloading", version: state.version, progress: 0 });

    try {
      await update.downloadAndInstall((event) => {
        const fraction = event.fraction ?? 0;
        setState((prev) =>
          prev.status === "downloading"
            ? { ...prev, progress: Math.round(fraction * 100) }
            : prev,
        );
      });
      setState({ status: "ready", version: state.version });
    } catch (err) {
      setState({ status: "error", message: err instanceof Error ? err.message : "Update failed" });
    }
  }

  async function handleRestart() {
    try {
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    } catch {
      // Fallback if process plugin isn't available
      window.location.reload();
    }
  }

  function handleSkip(version: string) {
    skipVersion(version);
    setState({ status: "dismissed" });
  }

  function handleDismiss() {
    setState({ status: "dismissed" });
  }

  // ── Auto-update modal (Windows / macOS / AppImage) ──
  if (state.status === "available") {
    return (
      <Overlay>
        <Modal>
          <ModalHeader>
            <IconBadge>
              <ArrowDownToLine size={18} />
            </IconBadge>
            <div>
              <h2 style={modalTitleStyle}>Update Available</h2>
              <p style={modalSubtitleStyle}>Nextract v{state.version} is ready to install</p>
            </div>
            <CloseButton onClick={handleDismiss} />
          </ModalHeader>

          {state.notes && (
            <div style={releaseNotesStyle}>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--foreground-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>
                What&apos;s new
              </p>
              <p style={{ fontSize: "13px", color: "var(--foreground-muted)", lineHeight: 1.55, whiteSpace: "pre-wrap", maxHeight: "120px", overflow: "auto" }}>
                {state.notes}
              </p>
            </div>
          )}

          <div style={modalActionsStyle}>
            <button
              onClick={() => handleSkip(state.version)}
              style={secondaryBtnStyle}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-hover)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-raised)"; }}
            >
              <SkipForward size={14} />
              Skip Version
            </button>
            <button
              onClick={handleDismiss}
              style={secondaryBtnStyle}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-hover)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-raised)"; }}
            >
              <Clock size={14} />
              Later
            </button>
            <button onClick={handleUpdate} style={primaryBtnStyle}>
              <Download size={14} />
              Update Now
            </button>
          </div>
        </Modal>
      </Overlay>
    );
  }

  // ── Downloading state ──
  if (state.status === "downloading") {
    return (
      <Overlay>
        <Modal>
          <ModalHeader>
            <IconBadge>
              <RefreshCw size={18} style={{ animation: "spin 1s linear infinite" }} />
            </IconBadge>
            <div>
              <h2 style={modalTitleStyle}>Updating Nextract</h2>
              <p style={modalSubtitleStyle}>Downloading v{state.version}…</p>
            </div>
          </ModalHeader>

          <div style={{ padding: "0 24px 24px" }}>
            <div style={progressTrackStyle}>
              <div
                style={{
                  ...progressBarStyle,
                  width: `${state.progress}%`,
                }}
              />
            </div>
            <p style={{ fontSize: "12px", color: "var(--foreground-muted)", textAlign: "center", marginTop: "8px" }}>
              {state.progress}% complete
            </p>
          </div>
        </Modal>
      </Overlay>
    );
  }

  // ── Ready to restart ──
  if (state.status === "ready") {
    return (
      <Overlay>
        <Modal>
          <ModalHeader>
            <IconBadge color="var(--success)">
              <ArrowDownToLine size={18} />
            </IconBadge>
            <div>
              <h2 style={modalTitleStyle}>Update Installed</h2>
              <p style={modalSubtitleStyle}>Restart Nextract to finish updating to v{state.version}</p>
            </div>
          </ModalHeader>
          <div style={{ ...modalActionsStyle, justifyContent: "flex-end" }}>
            <button onClick={handleDismiss} style={secondaryBtnStyle}>Later</button>
            <button onClick={handleRestart} style={primaryBtnStyle}>
              <RefreshCw size={14} />
              Restart Now
            </button>
          </div>
        </Modal>
      </Overlay>
    );
  }

  // ── Error state ──
  if (state.status === "error") {
    return (
      <Overlay>
        <Modal>
          <ModalHeader>
            <IconBadge color="var(--error)">
              <ArrowDownToLine size={18} />
            </IconBadge>
            <div>
              <h2 style={modalTitleStyle}>Update Failed</h2>
              <p style={modalSubtitleStyle}>{state.message}</p>
            </div>
            <CloseButton onClick={handleDismiss} />
          </ModalHeader>
          <div style={{ ...modalActionsStyle, justifyContent: "flex-end" }}>
            <button onClick={handleDismiss} style={secondaryBtnStyle}>Dismiss</button>
          </div>
        </Modal>
      </Overlay>
    );
  }

  // ── Manual update banner (deb/rpm Linux) ──
  if (state.status === "available-manual") {
    return (
      <div style={bannerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
          <ArrowDownToLine size={16} style={{ flexShrink: 0, color: "var(--primary-strong)" }} />
          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)" }}>
            Nextract v{state.version} is available
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            onClick={() => handleSkip(state.version)}
            style={bannerBtnStyle}
            title="Don't show again for this version"
          >
            Skip
          </button>
          <a
            href={state.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              ...bannerBtnStyle,
              background: "var(--primary)",
              color: "var(--on-primary)",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <ExternalLink size={12} />
            Download
          </a>
          <button onClick={handleDismiss} style={bannerCloseBtnStyle} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  return null;
}

/* ── Sub-components ──────────────────────────────────────────── */

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(4px)",
        animation: "fadeIn 0.2s ease-out",
      }}
    >
      {children}
    </div>
  );
}

function Modal({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: "440px",
        borderRadius: "18px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        boxShadow: "0 24px 48px rgba(0,0,0,0.25)",
        overflow: "hidden",
        animation: "slideUp 0.25s ease-out",
      }}
    >
      {children}
    </div>
  );
}

function ModalHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        padding: "24px 24px 16px",
      }}
    >
      {children}
    </div>
  );
}

function IconBadge({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "40px",
        height: "40px",
        borderRadius: "12px",
        background: "var(--primary-soft)",
        border: "1px solid var(--border-primary)",
        flexShrink: 0,
        color: color ?? "var(--primary-strong)",
      }}
    >
      {children}
    </span>
  );
}

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Close"
      style={{
        marginLeft: "auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "28px",
        height: "28px",
        borderRadius: "8px",
        border: "1px solid var(--border-strong)",
        background: "var(--surface-raised)",
        color: "var(--foreground-muted)",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      <X size={14} />
    </button>
  );
}

/* ── Styles ──────────────────────────────────────────────────── */

const modalTitleStyle: React.CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: "17px",
  fontWeight: 700,
  letterSpacing: "-0.02em",
  color: "var(--foreground)",
  lineHeight: 1.2,
};

const modalSubtitleStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "var(--foreground-muted)",
  marginTop: "2px",
  lineHeight: 1.4,
};

const releaseNotesStyle: React.CSSProperties = {
  margin: "0 24px 20px",
  padding: "12px 14px",
  borderRadius: "10px",
  background: "var(--surface-raised)",
  border: "1px solid var(--border-strong)",
};

const modalActionsStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "0 24px 24px",
};

const primaryBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "9px 20px",
  borderRadius: "10px",
  border: "none",
  background: "var(--primary)",
  color: "var(--on-primary)",
  fontSize: "13px",
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "var(--font-body)",
  transition: "all 0.15s var(--ease-out)",
  boxShadow: "0 2px 8px var(--primary-glow)",
  marginLeft: "auto",
};

const secondaryBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "9px 16px",
  borderRadius: "10px",
  border: "1.5px solid var(--border-strong)",
  background: "var(--surface-raised)",
  color: "var(--foreground-muted)",
  fontSize: "13px",
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "var(--font-body)",
  transition: "all 0.15s var(--ease-out)",
};

const progressTrackStyle: React.CSSProperties = {
  width: "100%",
  height: "6px",
  borderRadius: "9999px",
  background: "var(--surface-strong)",
  overflow: "hidden",
};

const progressBarStyle: React.CSSProperties = {
  height: "100%",
  borderRadius: "9999px",
  background: "var(--primary)",
  transition: "width 0.3s ease-out",
};

const bannerStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  zIndex: 9998,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  padding: "10px 20px",
  background: "var(--primary-soft)",
  borderBottom: "1px solid var(--border-primary)",
  animation: "slideDown 0.3s ease-out",
};

const bannerBtnStyle: React.CSSProperties = {
  padding: "5px 12px",
  borderRadius: "7px",
  border: "1px solid var(--border-strong)",
  background: "var(--surface-raised)",
  color: "var(--foreground-muted)",
  fontSize: "12px",
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "var(--font-body)",
};

const bannerCloseBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "24px",
  height: "24px",
  borderRadius: "6px",
  border: "none",
  background: "transparent",
  color: "var(--foreground-muted)",
  cursor: "pointer",
};
