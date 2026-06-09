import {
  ArrowLeft,
  CirclePlay,
  Download,
  FileAudio,
  SlidersHorizontal,
} from "lucide-react";

import type { AnalyzeResponse, QualityValue } from "@/lib/types";

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
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-5" aria-label="Media preview">
      <button
        className="flex w-fit items-center gap-3 rounded-lg px-2 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-muted)]"
        onClick={onBack}
        type="button"
      >
        <ArrowLeft size={22} aria-hidden="true" />
        Back to Paste
      </button>

      <div className="overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] shadow-[var(--shadow-lift)] xl:grid xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
        <div className="bg-black/90 p-3 sm:p-4 xl:flex xl:items-center">
          <div
            aria-label={`${preview.title} thumbnail`}
            className="relative mx-auto aspect-video w-full overflow-hidden rounded-xl bg-[var(--surface-muted)] bg-contain bg-center bg-no-repeat"
            role="img"
            style={{
              backgroundImage: preview.thumbnail ? `url(${preview.thumbnail})` : undefined,
            }}
          >
            {!preview.thumbnail ? (
              <div className="flex h-full w-full items-center justify-center text-[var(--foreground-soft)]">
                <CirclePlay size={48} aria-hidden="true" />
              </div>
            ) : null}
            {preview.duration ? (
              <span className="absolute bottom-3 right-3 rounded-md bg-black/85 px-2 py-1 text-sm font-bold text-white">
                {formatDuration(preview.duration)}
              </span>
            ) : null}
          </div>
        </div>
        <div className="min-w-0 flex flex-col gap-6 p-5 sm:p-6 xl:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="max-w-2xl text-balance text-2xl font-bold leading-tight tracking-tight md:text-3xl xl:text-2xl 2xl:text-3xl">
                {preview.title}
              </h2>
              <p className="mt-3 truncate text-base text-[var(--foreground-muted)] sm:text-lg xl:text-base">
                {preview.creator ?? "YouTube"}
              </p>
            </div>
            <span className="flex shrink-0 items-center gap-2 rounded-md bg-[var(--error-soft)] px-3 py-2 text-sm font-bold text-[var(--error)]">
              <CirclePlay size={18} aria-hidden="true" />
              YouTube
            </span>
          </div>

          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">
              Select Quality
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
              {preview.qualities.map((option) => (
                <button
                  className={`flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-full px-4 text-sm font-bold transition ${
                    option.value === selectedQuality
                      ? "bg-[var(--primary)] text-white"
                      : "bg-[var(--surface-muted)] text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
                  }`}
                  key={option.value}
                  onClick={() => onSelectQuality(option.value)}
                  type="button"
                >
                  {option.kind === "audio" ? (
                    <FileAudio className="shrink-0" size={17} aria-hidden="true" />
                  ) : null}
                  <span className="truncate">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-[var(--border-soft)] pt-5 sm:flex-row">
            <button
              className="flex min-h-14 flex-1 cursor-not-allowed items-center justify-center gap-3 rounded-lg bg-[var(--primary)] px-6 text-base font-bold text-white opacity-75"
              disabled
              type="button"
            >
              <Download size={22} aria-hidden="true" />
              Download in Phase 3
            </button>
            <button
              className="flex min-h-14 cursor-not-allowed items-center justify-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-6 text-base font-bold text-[var(--foreground)] opacity-70"
              disabled
              type="button"
            >
              <SlidersHorizontal size={22} aria-hidden="true" />
              Advanced Options Later
            </button>
          </div>
        </div>
      </div>
      <p className="text-center text-sm font-semibold text-[var(--foreground-soft)]">
        Analysis complete. File size and final quality may vary depending on source availability.
      </p>
    </section>
  );
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
