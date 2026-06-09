"use client";

import {
  ArrowLeft,
  CirclePlay,
  Clock,
  Download,
  FileAudio,
  SlidersHorizontal,
} from "lucide-react";
import type { AnalyzeResponse, QualityValue } from "@/lib/types";

const Youtube = ({ size, ...rest }: { size?: number } & React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="currentColor"
    viewBox="0 0 24 24"
  >
    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
  </svg>
);

export function MediaPreviewCard({
  onBack,
  onSelectQuality,
  preview,
  selectedQuality,
}: {
  onBack: () => void;
  onSelectQuality: (quality: QualityValue) => void;
  preview: AnalyzeResponse;
  selectedQuality: QualityValue | null;
}) {
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
            </div>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Actions */}
            <div
              className="flex flex-col gap-3 pt-5 sm:flex-row"
              style={{ borderTop: "1px solid var(--border-soft)" }}
            >
              <button
                className="flex flex-1 min-h-12 items-center justify-center gap-2.5 rounded-xl text-sm font-bold transition-all cursor-not-allowed"
                disabled
                type="button"
                style={{
                  background: "var(--primary)",
                  color: "#fff",
                  opacity: 0.6,
                  boxShadow: "0 4px 16px var(--primary-glow)",
                }}
              >
                <Download size={18} aria-hidden="true" />
                Download — Phase 3
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