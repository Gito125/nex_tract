"use client";

import { ArrowLeft, ClipboardList, Download } from "lucide-react";

import type { AnalyzeResponse } from "@/lib/types";

export function PlaylistPreviewCard({
  onBack,
  preview,
}: {
  onBack: () => void;
  preview: AnalyzeResponse;
}) {
  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-5" aria-label="Playlist preview">
      <button
        className="flex w-fit items-center gap-3 rounded-lg px-2 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-muted)]"
        onClick={onBack}
        type="button"
      >
        <ArrowLeft size={22} aria-hidden="true" />
        Back to Paste
      </button>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-left shadow-[var(--shadow-lift)] sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <ClipboardList size={36} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--foreground-soft)]">
              YouTube playlist detected
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              {preview.title}
            </h2>
            <p className="mt-3 text-base leading-7 text-[var(--foreground-muted)]">
              {preview.playlist?.itemCount ?? 0} items found. Playlist item selection and playlist downloads come in a later phase.
            </p>
          </div>
        </div>

        <div className="mt-8 border-t border-[var(--border-soft)] pt-5">
          <button
            className="flex min-h-14 w-full cursor-not-allowed items-center justify-center gap-3 rounded-lg bg-[var(--primary)] px-6 text-base font-bold text-white opacity-75 sm:w-auto"
            disabled
            type="button"
          >
            <Download size={22} aria-hidden="true" />
            Playlist Download Later
          </button>
        </div>
      </div>
    </section>
  );
}
