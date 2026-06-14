"use client";

import { useState } from "react";
import {
  ArrowLeft,
  CirclePlay,
  Clock,
  Disc3,
  Download,
  FileAudio,
} from "lucide-react";
import { getApiAssetUrl } from "@/lib/api";
import { PLATFORM_META } from "@/lib/platforms";
import type { AnalyzeResponse, QualityValue, RawFormat } from "@/lib/types";
import { PlatformBadge } from "@/components/common/platform-badge";
import { GenericEngineIndicator } from "@/components/common/generic-engine-indicator";

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
  const isAudioMedia = preview.type === "audio";
  const isAudioSelection = isAudioMedia || (selectedQuality?.startsWith("audio_") ?? false);
  const isImageMedia = preview.type === "image" || preview.type === "gallery";
  const thumbnailUrl = getApiAssetUrl(preview.thumbnail);
  const platformMeta = PLATFORM_META[preview.platform];
  const displayQualities = isAudioMedia
    ? preview.qualities.filter(q => q.kind === "audio")
    : preview.qualities;

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
        Back to input
      </button>

      {/* Main card */}
      <div
        style={{
          borderRadius: "16px",
          overflow: "hidden",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-lift)",
          padding: "1rem",
        }}

      >
        <div className="flex flex-col md:flex-row gap-6 p-6 items-start" style={{ display: "flex", alignItems: "flex-start" }}>
          {/* Thumbnail pane */}
          <div
            className="w-full md:w-[400px] shrink-0"
            style={{
              position: "relative",
              background: isAudioSelection
                ? "linear-gradient(145deg, var(--surface-muted), var(--surface-strong))"
                : isImageMedia
                ? "var(--surface-muted)"
                : "#0A0A14",
              aspectRatio: "16/9",
              borderRadius: "12px",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <PreviewArtwork
              duration={preview.duration}
              isAudio={isAudioSelection}
              isImage={isImageMedia}
              thumbnail={thumbnailUrl}
              title={preview.title}
            />
          </div>

          {/* Details pane */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              flex: 1,
              minWidth: 0,
              alignSelf: "stretch",
            }}
          >
            {/* Header */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                <PlatformBadge platform={preview.platform} />
                <GenericEngineIndicator isGeneric={preview.isGeneric} />
              </div>

              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "18px",
                  fontWeight: 700,
                  letterSpacing: "-0.025em",
                  lineHeight: 1.3,
                  color: "var(--foreground)",
                  marginBottom: "4px",
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
                {preview.creator ?? platformMeta.fallbackCreator}
              </p>
            </div>

            {/* Quality selector */}
            <div>
              <p
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "var(--foreground-subtle)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                }}
              >
                {isImageMedia ? "Image" : "Format & Quality"}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {displayQualities.map((option) => {
                  const isSelected = option.value === selectedQuality;
                  const optionSize = estimateSelectedSize(preview.rawFormats, option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onSelectQuality(option.value)}
                      className={`quality-pill ${isSelected ? "quality-pill--active" : ""}`}
                    >
                      {option.kind === "audio" && (
                        <FileAudio size={11} className="shrink-0" aria-hidden="true" />
                      )}
                      <span>{option.label}</span>
                      {optionSize ? (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            opacity: 0.75,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {formatBytes(optionSize)}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
              {selectedSize ? (
                <p
                  style={{
                    fontSize: "11px",
                    color: "var(--foreground-soft)",
                    marginTop: "6px",
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
              {preview.type === "gallery" && preview.imageCount ? (
                <p
                  style={{
                    fontSize: "11px",
                    color: "var(--foreground-soft)",
                    marginTop: "6px",
                    lineHeight: 1.5,
                  }}
                >
                  {preview.imageCount} images will be saved into a folder.
                </p>
              ) : null}
            </div>

            {/* Spacer */}
            <div style={{ flex: 1, minHeight: "8px" }} />

            {/* Actions */}
            <div
              className="flex flex-col sm:flex-row"
              style={{
                paddingTop: "16px",
                borderTop: "1px solid var(--border-soft)",
                gap: "8px",
              }}
            >
              <button
                type="button"
                onClick={onBack}
                style={{
                  flex: 1,
                  minHeight: "38px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-strong)",
                  background: "var(--surface-raised)",
                  color: "var(--foreground-muted)",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "var(--font-body)",
                  transition: "all 0.15s var(--ease-out)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-hover)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--foreground)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-raised)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--foreground-muted)";
                }}
              >
                <ArrowLeft size={14} aria-hidden="true" />
                Download Next
              </button>

              <button
                type="button"
                disabled={!selectedQuality || isDownloadPending}
                onClick={onDownload}
                style={{
                  flex: 1,
                  minHeight: "38px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  borderRadius: "8px",
                  border: "none",
                  background: "var(--primary)",
                  color: "var(--on-primary)",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: !selectedQuality || isDownloadPending ? "not-allowed" : "pointer",
                  opacity: !selectedQuality || isDownloadPending ? 0.65 : 1,
                  boxShadow: "0 2px 8px var(--primary-glow)",
                  fontFamily: "var(--font-body)",
                  transition: "all 0.15s var(--ease-out)",
                }}
                onMouseEnter={(e) => {
                  if (selectedQuality && !isDownloadPending) {
                    (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 12px var(--primary-glow)";
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 2px 8px var(--primary-glow)";
                }}
              >
                <Download size={14} aria-hidden="true" />
                {isDownloadPending ? "Starting…" : "Download Now"}
              </button>
            </div>

            {downloadError && (
              <p
                role="alert"
                style={{ fontSize: "12px", fontWeight: 500, color: "var(--error)", marginTop: "-4px" }}
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
  isImage,
  thumbnail,
  title,
}: {
  duration: number | null;
  isAudio: boolean;
  isImage: boolean;
  thumbnail: string | null;
  title: string;
}) {
  const [failedThumbnail, setFailedThumbnail] = useState<string | null>(null);
  const usableThumbnail = thumbnail && failedThumbnail !== thumbnail ? thumbnail : null;

  if (isAudio) {
    return (
      <div
        style={{ position: "relative", width: "100%", aspectRatio: "16/9", display: "flex", alignItems: "center", justifyContent: "center" }}
        role="img"
        aria-label={`${title} audio artwork`}
      >
        {usableThumbnail && (
          <img
            src={usableThumbnail}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setFailedThumbnail(usableThumbnail)}
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
          {usableThumbnail ? (
            <img
              src={usableThumbnail}
              alt={title}
              referrerPolicy="no-referrer"
              onError={() => setFailedThumbnail(usableThumbnail)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
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
      {usableThumbnail ? (
        <img
          src={usableThumbnail}
          alt={title}
          referrerPolicy="no-referrer"
          onError={() => setFailedThumbnail(usableThumbnail)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
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
      {isImage && (
        <span
          style={{
            position: "absolute",
            bottom: "12px",
            left: "12px",
            background: "var(--overlay-strong)",
            color: "var(--on-primary)",
            borderRadius: "6px",
            padding: "4px 8px",
            fontSize: "12px",
            fontWeight: 700,
          }}
        >
          Image
        </span>
      )}
      {duration && !isImage && (
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
  if (selectedQuality === "image_original") return largestKnownSize(formats);
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
