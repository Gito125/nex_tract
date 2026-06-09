"use client";

import {
  ArrowLeft,
  CirclePlay,
  Clock,
  Disc3,
  Download,
  FileAudio,
} from "lucide-react";
import type { AnalyzeResponse, QualityValue, RawFormat } from "@/lib/types";

const YoutubeLogo = ({ size = 14 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" height={size} width={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
  </svg>
);

export function MediaPreviewCard({
  downloadError,
  isDownloadPending,
  onBack,
  onDownload,
  onSelectQuality,
  preview,
  selectedQuality,
}: {
  downloadError: string | null;
  isDownloadPending: boolean;
  onBack: () => void;
  onDownload: () => void;
  onSelectQuality: (quality: QualityValue) => void;
  preview: AnalyzeResponse;
  selectedQuality: QualityValue | null;
}) {
  const selectedSize = estimateSelectedSize(preview.rawFormats, selectedQuality);
  const isAudioSelection = selectedQuality?.startsWith("audio_") ?? false;

  return (
    <section className="animate-fade-up" aria-label="Media preview">
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "7px",
          padding: "7px 12px 7px 8px",
          borderRadius: "8px",
          background: "none",
          border: "1px solid transparent",
          cursor: "pointer",
          fontSize: "13px",
          fontWeight: 600,
          color: "var(--foreground-muted)",
          marginBottom: "20px",
          transition: "all 0.15s",
          fontFamily: "var(--font-body)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-raised)";
          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-strong)";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--foreground)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "none";
          (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--foreground-muted)";
        }}
      >
        <ArrowLeft size={15} aria-hidden="true" />
        Back to paste
      </button>

      {/* Main card */}
      <div
        style={{
          borderRadius: "20px",
          overflow: "hidden",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-lift)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
          }}
          className="xl:grid-cols-[1.4fr_1fr]"
        >
          {/* Thumbnail pane */}
          <div
            style={{
              position: "relative",
              background: isAudioSelection
                ? "linear-gradient(145deg, var(--surface-muted), var(--surface-strong))"
                : "oklch(8% 0.010 265)",
              minHeight: "280px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <PreviewArtwork
              duration={preview.duration}
              isAudio={isAudioSelection}
              thumbnail={preview.thumbnail}
              title={preview.title}
            />
          </div>

          {/* Details pane */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "24px",
              padding: "28px",
            }}
          >
            {/* Header */}
            <div>
              {/* Platform tag */}
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  background: "oklch(96% 0.02 22)",
                  border: "1px solid oklch(88% 0.06 22)",
                  color: "#CC2020",
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                  marginBottom: "12px",
                }}
              >
                <YoutubeLogo size={11} />
                YouTube
              </span>

              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "22px",
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.25,
                  color: "var(--foreground)",
                  marginBottom: "6px",
                }}
              >
                {preview.title}
              </h2>
              <p
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--foreground-muted)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {preview.creator ?? "YouTube"}
              </p>
            </div>

            {/* Quality selector */}
            <div>
              <p
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "var(--foreground-subtle)",
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  marginBottom: "10px",
                }}
              >
                Format & Quality
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {preview.qualities.map((option) => {
                  const isSelected = option.value === selectedQuality;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onSelectQuality(option.value)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "7px 14px",
                        borderRadius: "9999px",
                        border: isSelected
                          ? "1.5px solid var(--primary)"
                          : "1.5px solid var(--border-strong)",
                        background: isSelected ? "var(--primary)" : "var(--surface-raised)",
                        color: isSelected ? "var(--on-primary)" : "var(--foreground-muted)",
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "var(--font-body)",
                        transition: "all 0.15s var(--ease-out)",
                        boxShadow: isSelected ? "0 2px 10px var(--primary-glow)" : "none",
                      }}
                    >
                      {option.kind === "audio" && (
                        <FileAudio size={12} className="shrink-0" aria-hidden="true" />
                      )}
                      {option.label}
                    </button>
                  );
                })}
              </div>
              {selectedSize ? (
                <p
                  style={{
                    fontSize: "12px",
                    color: "var(--foreground-soft)",
                    marginTop: "10px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  Estimated size:{" "}
                  <span style={{ fontWeight: 600, color: "var(--foreground-muted)", fontVariantNumeric: "tabular-nums" }}>
                    {formatBytes(selectedSize)}
                  </span>
                </p>
              ) : null}
            </div>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Actions */}
            <div
              style={{
                paddingTop: "20px",
                borderTop: "1px solid var(--border-soft)",
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                disabled={!selectedQuality || isDownloadPending}
                onClick={onDownload}
                style={{
                  flex: 1,
                  minHeight: "46px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  borderRadius: "10px",
                  border: "none",
                  background: "var(--primary)",
                  color: "var(--on-primary)",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: !selectedQuality || isDownloadPending ? "not-allowed" : "pointer",
                  opacity: !selectedQuality || isDownloadPending ? 0.65 : 1,
                  boxShadow: "0 4px 14px var(--primary-glow)",
                  fontFamily: "var(--font-body)",
                  transition: "all 0.15s var(--ease-out)",
                  letterSpacing: "-0.01em",
                }}
                onMouseEnter={(e) => {
                  if (selectedQuality && !isDownloadPending) {
                    (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 20px var(--primary-glow)";
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 14px var(--primary-glow)";
                }}
              >
                <Download size={16} aria-hidden="true" />
                {isDownloadPending ? "Starting…" : "Download Now"}
              </button>

            </div>

            {downloadError && (
              <p
                role="alert"
                style={{ fontSize: "13px", fontWeight: 500, color: "var(--error)", marginTop: "-8px" }}
              >
                {downloadError}
              </p>
            )}
          </div>
        </div>
      </div>

      <p
        style={{
          textAlign: "center",
          fontSize: "12px",
          color: "var(--foreground-subtle)",
          marginTop: "12px",
        }}
      >
        Analysis complete · File size and quality may vary based on source availability.
      </p>
    </section>
  );
}

function PreviewArtwork({
  duration,
  isAudio,
  thumbnail,
  title,
}: {
  duration: number | null;
  isAudio: boolean;
  thumbnail: string | null;
  title: string;
}) {
  if (isAudio) {
    return (
      <div
        style={{ position: "relative", width: "100%", aspectRatio: "16/9", display: "flex", alignItems: "center", justifyContent: "center" }}
        role="img"
        aria-label={`${title} audio artwork`}
      >
        {thumbnail && (
          <img
            src={thumbnail}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.25,
              filter: "blur(16px)",
              transform: "scale(1.1)",
            }}
          />
        )}
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100px",
            height: "100px",
            borderRadius: "20px",
            background: "var(--surface)",
            border: "1px solid var(--border-strong)",
            boxShadow: "var(--shadow-float)",
            overflow: "hidden",
          }}
        >
          {thumbnail ? (
            <img src={thumbnail} alt={title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <Disc3 size={48} style={{ color: "var(--foreground-soft)" }} aria-hidden="true" />
          )}
          <span
            style={{
              position: "absolute",
              bottom: "6px",
              right: "6px",
              background: "var(--overlay-soft)",
              color: "var(--on-primary)",
              borderRadius: "5px",
              padding: "3px 6px",
              fontSize: "10px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "3px",
            }}
          >
            <FileAudio size={11} aria-hidden="true" />
            Audio
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ position: "relative", width: "100%", aspectRatio: "16/9" }}
      role="img"
      aria-label={`${title} thumbnail`}
    >
      {thumbnail ? (
        <img src={thumbnail} alt={title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            background: "var(--surface-strong)",
          }}
        >
          <CirclePlay size={52} style={{ color: "var(--foreground-subtle)" }} aria-hidden="true" />
        </div>
      )}
      {duration && (
        <span
          style={{
            position: "absolute",
            bottom: "12px",
            right: "12px",
            background: "var(--overlay-strong)",
            color: "var(--on-primary)",
            borderRadius: "6px",
            padding: "4px 8px",
            fontSize: "12px",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: "5px",
            backdropFilter: "blur(8px)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <Clock size={11} aria-hidden="true" />
          {formatDuration(duration)}
        </span>
      )}
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────── */
function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function estimateSelectedSize(formats: RawFormat[], selectedQuality: QualityValue | null): number | null {
  if (!selectedQuality) return null;
  if (selectedQuality === "best") return bestVideoSize(formats);
  if (selectedQuality.startsWith("audio_")) return audioSize(formats, selectedQuality);
  return videoSizeForHeight(formats, Number.parseInt(selectedQuality, 10));
}

function bestVideoSize(formats: RawFormat[]): number | null {
  const vf = formats.filter(f => hasVideo(f)).sort((a, b) => (b.height ?? 0) - (a.height ?? 0));
  for (const f of vf) { const s = combinedVideoAudioSize(f, formats); if (s) return s; }
  return null;
}

function videoSizeForHeight(formats: RawFormat[], height: number): number | null {
  const mf = formats.filter(f => hasVideo(f) && f.height === height).sort((a, b) => (b.filesize ?? 0) - (a.filesize ?? 0));
  for (const f of mf) { const s = combinedVideoAudioSize(f, formats); if (s) return s; }
  return null;
}

function combinedVideoAudioSize(vf: RawFormat, formats: RawFormat[]): number | null {
  const vs = vf.filesize;
  if (!vs) return null;
  if (hasAudio(vf)) return vs;
  const as = bestAudioSize(formats);
  return as ? vs + as : vs;
}

function audioSize(formats: RawFormat[], selectedQuality: QualityValue): number | null {
  const ext = selectedQuality.replace("audio_", "");
  const preferred = formats.filter(f => hasAudio(f) && !hasVideo(f) && f.ext === ext);
  return largestKnownSize(preferred) ?? bestAudioSize(formats);
}

function bestAudioSize(formats: RawFormat[]): number | null {
  return largestKnownSize(formats.filter(f => hasAudio(f) && !hasVideo(f)));
}

function largestKnownSize(formats: RawFormat[]): number | null {
  const sizes = formats.map(f => f.filesize).filter((s): s is number => typeof s === "number" && s > 0);
  return sizes.length > 0 ? Math.max(...sizes) : null;
}

function hasVideo(f: RawFormat): boolean { return Boolean(f.vcodec && f.vcodec !== "none"); }
function hasAudio(f: RawFormat): boolean { return Boolean(f.acodec && f.acodec !== "none"); }

function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes, i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toLocaleString(undefined, { maximumFractionDigits: v >= 10 || i === 0 ? 0 : 1 })} ${units[i]}`;
}
