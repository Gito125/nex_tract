import {
  ArrowLeft,
  CirclePlay,
  Download,
  FileAudio,
  SlidersHorizontal,
} from "lucide-react";

import type { MediaPreviewData } from "@/lib/types";

export function MediaPreviewCard({
  preview,
  selectedQualityId,
}: {
  preview: MediaPreviewData;
  selectedQualityId: string;
}) {
  return (
    <section className="mx-auto hidden w-full max-w-6xl flex-col gap-5" aria-label="Media preview">
      <button className="flex w-fit items-center gap-3 rounded-lg px-2 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-muted)]">
        <ArrowLeft size={22} aria-hidden="true" />
        Back to Paste
      </button>

      <div className="overflow-hidden rounded-2xl bg-[var(--surface)] shadow-[var(--shadow-lift)] md:grid md:grid-cols-[0.9fr_1.2fr]">
        <div
          aria-label={`${preview.title} thumbnail`}
          className="relative aspect-video bg-cover bg-center"
          role="img"
          style={{
            backgroundImage: `url(${preview.thumbnailUrl})`,
            backgroundColor: "var(--surface-muted)",
          }}
        >
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-[var(--surface-muted)] opacity-10"
          />
          <span className="absolute bottom-4 right-4 rounded-md bg-black/80 px-2 py-1 text-sm font-bold text-white">
            {preview.duration}
          </span>
        </div>
        <div className="flex flex-col gap-6 p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                {preview.title}
              </h2>
              <p className="mt-3 text-lg text-[var(--foreground-muted)]">
                {preview.creator}
              </p>
            </div>
            <span className="flex items-center gap-2 rounded-md bg-[var(--error-soft)] px-3 py-2 text-sm font-bold text-[var(--error)]">
              <CirclePlay size={18} aria-hidden="true" />
              {preview.platform}
            </span>
          </div>

          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">
              Select Quality
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {preview.qualityOptions.map((option) => (
                <button
                  className={`flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-bold transition ${
                    option.id === selectedQualityId
                      ? "bg-[var(--primary)] text-white"
                      : "bg-[var(--surface-muted)] text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
                  }`}
                  key={option.id}
                  type="button"
                >
                  {option.kind === "audio" ? (
                    <FileAudio size={17} aria-hidden="true" />
                  ) : null}
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-[var(--border-soft)] pt-5 sm:flex-row">
            <button className="flex min-h-14 flex-1 items-center justify-center gap-3 rounded-lg bg-[var(--primary)] px-6 text-base font-bold text-white transition hover:bg-[var(--primary-strong)]">
              <Download size={22} aria-hidden="true" />
              Download Now
            </button>
            <button className="flex min-h-14 items-center justify-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-6 text-base font-bold text-[var(--foreground)] transition hover:bg-[var(--surface-muted)]">
              <SlidersHorizontal size={22} aria-hidden="true" />
              Advanced Options
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
