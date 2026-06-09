"use client";

import {
  CheckCircle2,
  Clock3,
  Download,
  LoaderCircle,
  RotateCcw,
  Square,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { DownloadJob, DownloadStatus } from "@/lib/types";

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
            Single-video jobs run one at a time.
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
            <QueueItem
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

function QueueItem({
  cancelState,
  job,
  onCancel,
  onRetry,
  retryState,
}: {
  cancelState: MutationState;
  job: DownloadJob;
  onCancel: (jobId: string) => void;
  onRetry: (jobId: string) => void;
  retryState: MutationState;
}) {
  const canCancel = job.status === "pending" || job.status === "downloading";
  const canRetry = job.status === "failed" || job.status === "cancelled";

  return (
    <article
      className="grid gap-3 rounded-xl p-4 sm:grid-cols-[1fr_auto] sm:items-center"
      style={{
        background: "var(--surface-raised)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <StatusBadge status={job.status} />
          <span
            className="rounded-md px-2 py-1 text-xs font-bold uppercase tracking-widest"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--foreground-soft)",
            }}
          >
            {job.selectedQuality.replace("_", " ")}
          </span>
        </div>

        <h3
          className="truncate text-sm font-bold sm:text-base"
          style={{ color: "var(--foreground)" }}
          title={job.title}
        >
          {job.title}
        </h3>

        <p className="mt-1 truncate text-xs" style={{ color: "var(--foreground-soft)" }}>
          YouTube{job.outputPath ? ` · ${job.outputPath}` : ""}
        </p>

        {job.errorMessage ? (
          <p className="mt-2 text-sm font-medium" style={{ color: "var(--error)" }}>
            {job.errorMessage}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2 sm:justify-end">
        {canCancel ? (
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold transition-all active:scale-95 disabled:cursor-wait disabled:opacity-60"
            disabled={cancelState.isPending && cancelState.jobId === job.id}
            onClick={() => onCancel(job.id)}
            type="button"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border-strong)",
              color: "var(--foreground-muted)",
            }}
          >
            <Square size={14} aria-hidden="true" />
            Cancel
          </button>
        ) : null}

        {canRetry ? (
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold transition-all active:scale-95 disabled:cursor-wait disabled:opacity-60"
            disabled={retryState.isPending && retryState.jobId === job.id}
            onClick={() => onRetry(job.id)}
            type="button"
            style={{
              background: "var(--primary)",
              color: "#fff",
              boxShadow: "0 4px 16px var(--primary-glow)",
            }}
          >
            <RotateCcw size={14} aria-hidden="true" />
            Retry
          </button>
        ) : null}
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: DownloadStatus }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold capitalize"
      style={{
        background: meta.background,
        color: meta.color,
        border: `1px solid ${meta.border}`,
      }}
    >
      <Icon
        className={status === "downloading" ? "animate-spin" : undefined}
        size={13}
        aria-hidden="true"
      />
      {status}
    </span>
  );
}

const STATUS_META = {
  pending: {
    icon: Clock3,
    color: "var(--foreground-muted)",
    background: "var(--surface)",
    border: "var(--border-strong)",
  },
  downloading: {
    icon: Download,
    color: "var(--primary-strong)",
    background: "var(--primary-soft)",
    border: "var(--border-primary)",
  },
  completed: {
    icon: CheckCircle2,
    color: "var(--success)",
    background: "var(--success-soft)",
    border: "var(--success)",
  },
  failed: {
    icon: XCircle,
    color: "var(--error)",
    background: "var(--error-soft)",
    border: "var(--error)",
  },
  cancelled: {
    icon: Square,
    color: "var(--foreground-soft)",
    background: "var(--surface)",
    border: "var(--border-strong)",
  },
} satisfies Record<
  DownloadStatus,
  {
    icon: LucideIcon;
    color: string;
    background: string;
    border: string;
  }
>;
