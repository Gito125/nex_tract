"use client";

import {
  ArrowLeft,
  CirclePlay,
  Clock,
  Download,
  FileAudio,
  SlidersHorizontal,
} from "lucide-react";
import type { AnalyzeResponse, QualityValue, RawFormat } from "@/lib/types";

const Youtube = ({ size, ...rest }: { size?: number } & React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    height={size ?? 20}
    width={size ?? 20}
    fill="currentColor"
    viewBox="0 0 24 24"
    {...rest}
  >
    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
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

  return (
    <section
      className="mx-auto flex w-full max-w-5xl flex-col gap-5 animate-fade-up"
      aria-label="Media preview"
    >
      {/* Back */}
      <button
        className="flex w-fit items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all"
        onClick={onBack}
        type="button"
        style={{ color: "var(--foreground-muted)" }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-hover)";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--foreground)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--foreground-muted)";
        }}
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Back
      </button>

      {/* Card */}
      <div
        className="overflow-hidden rounded-2xl"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-lift)",
          display: "grid",
          gridTemplateColumns: "1fr",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
          }}
          className="xl:grid xl:grid-cols-[1.4fr_1fr]"
        >
          {/* Thumbnail pane */}
          <div
            className="relative flex items-center justify-center p-4"
            style={{ background: "#000", minHeight: "260px" }}
          >
            <div
              className="relative w-full overflow-hidden rounded-xl"
              style={{ aspectRatio: "16/9" }}
              role="img"
              aria-label={`${preview.title} thumbnail`}
            >
              {preview.thumbnail ? (
                <img
                  src={preview.thumbnail}
                  alt={preview.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center"
                  style={{ background: "var(--surface-strong)" }}
                >
                  <CirclePlay size={52} style={{ color: "var(--foreground-subtle)" }} aria-hidden="true" />
                </div>
              )}

              {/* Duration badge */}
              {preview.duration ? (
                <span
                  className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold"
                  style={{ background: "rgba(0,0,0,0.85)", color: "#fff", backdropFilter: "blur(8px)" }}
                >
                  <Clock size={11} aria-hidden="true" />
                  {formatDuration(preview.duration)}
                </span>
              ) : null}
            </div>
          </div>

          {/* Details pane */}
          <div className="flex flex-col gap-6 p-6 xl:p-8" style={{ minWidth: 0 }}>
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div style={{ minWidth: 0, flex: 1 }}>
                {/* Platform tag */}
                <span
                  className="mb-3 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold"
                  style={{
                    background: "rgba(255,92,72,0.12)",
                    border: "1px solid rgba(255,92,72,0.2)",
                    color: "#FF5C48",
                  }}
                >
                  <Youtube size={11} aria-hidden="true" />
                  YouTube
                </span>

                <h2
                  className="text-xl font-bold leading-snug xl:text-2xl"
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    color: "var(--foreground)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {preview.title}
                </h2>
                <p className="mt-2 text-sm font-medium truncate" style={{ color: "var(--foreground-muted)" }}>
                  {preview.creator ?? "YouTube"}
                </p>
              </div>
            </div>

            {/* Quality selector */}
            <div>
              <p
                className="mb-3 text-xs font-bold uppercase tracking-widest"
                style={{ color: "var(--foreground-soft)" }}
              >
                Format & Quality
              </p>
              <div className="flex flex-wrap gap-2">
                {preview.qualities.map((option) => {
                  const isSelected = option.value === selectedQuality;
                  return (
                    <button
                      key={option.value}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-150 active:scale-95"
                      onClick={() => onSelectQuality(option.value)}
                      type="button"
                      style={{
                        background: isSelected ? "var(--primary)" : "var(--surface-raised)",
                        color: isSelected ? "#fff" : "var(--foreground-muted)",
                        border: isSelected
                          ? "1px solid var(--primary)"
                          : "1px solid var(--border)",
                        boxShadow: isSelected ? "0 4px 16px var(--primary-glow)" : "none",
                      }}
                    >
                      {option.kind === "audio" ? (
                        <FileAudio size={13} className="shrink-0" aria-hidden="true" />
                      ) : null}
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-sm font-medium" style={{ color: "var(--foreground-muted)" }}>
                Estimated size:{" "}
                <span style={{ color: "var(--foreground)" }}>
                  {selectedSize ? formatBytes(selectedSize) : "Unavailable"}
                </span>
              </p>
            </div>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Actions */}
            <div
              className="flex flex-col gap-3 pt-5 sm:flex-row"
              style={{ borderTop: "1px solid var(--border-soft)" }}
            >
              <button
                className="flex flex-1 min-h-12 items-center justify-center gap-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!selectedQuality || isDownloadPending}
                onClick={onDownload}
                type="button"
                style={{
                  background: "var(--primary)",
                  color: "#fff",
                  boxShadow: "0 4px 16px var(--primary-glow)",
                }}
              >
                <Download size={18} aria-hidden="true" />
                {isDownloadPending ? "Starting…" : "Download"}
              </button>
              <button
                className="flex min-h-12 items-center justify-center gap-2.5 rounded-xl px-5 text-sm font-bold cursor-not-allowed"
                disabled
                type="button"
                style={{
                  background: "var(--surface-raised)",
                  color: "var(--foreground-muted)",
                  border: "1px solid var(--border)",
                  opacity: 0.6,
                }}
              >
                <SlidersHorizontal size={16} aria-hidden="true" />
                Advanced
              </button>
            </div>
            {downloadError ? (
              <p className="text-sm font-medium" role="alert" style={{ color: "var(--error)" }}>
                {downloadError}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <p className="text-center text-xs" style={{ color: "var(--foreground-soft)" }}>
        Analysis complete · File size and quality may vary based on source availability.
      </p>
    </section>
  );
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function estimateSelectedSize(
  formats: RawFormat[],
  selectedQuality: QualityValue | null,
): number | null {
  if (!selectedQuality) return null;

  if (selectedQuality === "best") {
    return bestVideoSize(formats);
  }

  if (selectedQuality.startsWith("audio_")) {
    return audioSize(formats, selectedQuality);
  }

  const height = Number.parseInt(selectedQuality, 10);
  return videoSizeForHeight(formats, height);
}

function bestVideoSize(formats: RawFormat[]): number | null {
  const videoFormats = formats
    .filter((format) => hasVideo(format))
    .sort((a, b) => (b.height ?? 0) - (a.height ?? 0));

  for (const format of videoFormats) {
    const size = combinedVideoAudioSize(format, formats);
    if (size) return size;
  }

  return null;
}

function videoSizeForHeight(formats: RawFormat[], height: number): number | null {
  const matchingFormats = formats
    .filter((format) => hasVideo(format) && format.height === height)
    .sort((a, b) => (b.filesize ?? 0) - (a.filesize ?? 0));

  for (const format of matchingFormats) {
    const size = combinedVideoAudioSize(format, formats);
    if (size) return size;
  }

  return null;
}

function combinedVideoAudioSize(
  videoFormat: RawFormat,
  formats: RawFormat[],
): number | null {
  const videoSize = videoFormat.filesize;
  if (!videoSize) return null;

  if (hasAudio(videoFormat)) return videoSize;

  const audioSize = bestAudioSize(formats);
  return audioSize ? videoSize + audioSize : videoSize;
}

function audioSize(
  formats: RawFormat[],
  selectedQuality: QualityValue,
): number | null {
  const preferredExt = selectedQuality.replace("audio_", "");
  const preferredFormats = formats.filter(
    (format) => hasAudio(format) && !hasVideo(format) && format.ext === preferredExt,
  );

  return largestKnownSize(preferredFormats) ?? bestAudioSize(formats);
}

function bestAudioSize(formats: RawFormat[]): number | null {
  return largestKnownSize(
    formats.filter((format) => hasAudio(format) && !hasVideo(format)),
  );
}

function largestKnownSize(formats: RawFormat[]): number | null {
  const sizes = formats
    .map((format) => format.filesize)
    .filter((size): size is number => typeof size === "number" && size > 0);

  return sizes.length > 0 ? Math.max(...sizes) : null;
}

function hasVideo(format: RawFormat): boolean {
  return Boolean(format.vcodec && format.vcodec !== "none");
}

function hasAudio(format: RawFormat): boolean {
  return Boolean(format.acodec && format.acodec !== "none");
}

function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const maximumFractionDigits = value >= 10 || unitIndex === 0 ? 0 : 1;
  return `${value.toLocaleString(undefined, {
    maximumFractionDigits,
  })} ${units[unitIndex]}`;
}
