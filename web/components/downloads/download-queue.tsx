"use client";

import { LoaderCircle } from "lucide-react";

import { DownloadProgressCard } from "@/components/downloads/download-progress-card";
import type { DownloadJob } from "@/lib/types";

type MutationState = {
  isPending: boolean;
  jobId: string | null;
};

export function DownloadQueue({
  cancelState,
  error,
  isLoading,
  jobs,
  onCancel,
  onRetry,
  retryState,
}: {
  cancelState: MutationState;
  error: string | null;
  isLoading: boolean;
  jobs: DownloadJob[];
  onCancel: (jobId: string) => void;
  onRetry: (jobId: string) => void;
  retryState: MutationState;
}) {
  return (
    <section
      className="mx-auto mt-6 w-full max-w-5xl animate-fade-up rounded-2xl p-5"
      aria-label="Download queue"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            className="text-lg font-bold"
            style={{
              color: "var(--foreground)",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            Download Queue
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--foreground-muted)" }}>
            Live progress, speed, and ETA update as each job runs.
          </p>
        </div>

        {isLoading ? (
          <span
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
            style={{
              color: "var(--foreground-muted)",
              background: "var(--surface-raised)",
              border: "1px solid var(--border)",
            }}
          >
            <LoaderCircle className="animate-spin" size={13} aria-hidden="true" />
            Syncing
          </span>
        ) : null}
      </div>

      {error ? (
        <div
          className="mb-3 rounded-lg px-3 py-2 text-sm font-medium"
          role="alert"
          style={{
            background: "var(--error-soft)",
            border: "1px solid var(--error)30",
            color: "var(--error)",
          }}
        >
          {error}
        </div>
      ) : null}

      {jobs.length === 0 ? (
        <div
          className="flex min-h-28 items-center justify-center rounded-xl px-4 text-center text-sm"
          style={{
            background: "var(--surface-raised)",
            border: "1px solid var(--border)",
            color: "var(--foreground-muted)",
          }}
        >
          Downloads you start from this preview will appear here.
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <DownloadProgressCard
              cancelState={cancelState}
              job={job}
              key={job.id}
              onCancel={onCancel}
              onRetry={onRetry}
              retryState={retryState}
            />
          ))}
        </div>
      )}
    </section>
  );
}
