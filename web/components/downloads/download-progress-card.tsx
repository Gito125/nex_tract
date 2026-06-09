"use client";

import {
  CheckCircle2,
  Clock3,
  Disc3,
  Download,
  FileAudio,
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

export function DownloadProgressCard({
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
  const isAudio = job.selectedQuality.startsWith("audio_");
  const progressLabel = labelForProgress(job);

  return (
    <article
      className="grid gap-4 rounded-xl p-3 sm:grid-cols-[112px_1fr] sm:p-4"
      style={{
        background: "var(--surface-raised)",
        border: "1px solid var(--border)",
      }}
    >
      <MediaThumb
        duration={job.duration}
        isAudio={isAudio}
        thumbnail={job.thumbnail}
        title={job.title}
      />

      <div className="min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
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
              className="line-clamp-2 text-sm font-bold leading-snug sm:text-base"
              style={{ color: "var(--foreground)" }}
              title={job.title}
            >
              {job.title}
            </h3>
          </div>

          <div
            className="text-right font-mono text-sm font-bold tabular-nums"
            style={{ color: progressColor(job.status) }}
            aria-label={`${job.progress}% complete`}
          >
            {job.progress}%
          </div>
        </div>

        <div className="mt-3">
          <div
            className="h-2 overflow-hidden rounded-full"
            style={{ background: "var(--surface)" }}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={job.progress}
            aria-label={progressLabel}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.max(0, Math.min(job.progress, 100))}%`,
                background: progressColor(job.status),
              }}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <Metric label="Phase" value={progressLabel} />
            <Metric label="Speed" value={job.speed ?? "Waiting"} />
            <Metric label="ETA" value={job.eta ?? "Waiting"} />
            {job.fileSize ? <Metric label="Size" value={formatBytes(job.fileSize)} /> : null}
          </div>
        </div>

        {job.outputPath ? (
          <p
            className="mt-3 truncate text-xs"
            style={{ color: "var(--foreground-soft)" }}
            title={job.outputPath}
          >
            {job.outputPath}
          </p>
        ) : null}

        {job.errorMessage ? (
          <p className="mt-3 text-sm font-medium" style={{ color: "var(--error)" }}>
            {job.errorMessage}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
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
      </div>
    </article>
  );
}

function MediaThumb({
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
        className="relative aspect-video overflow-hidden rounded-lg sm:aspect-square"
        style={{
          background: "linear-gradient(145deg, var(--surface-muted), var(--surface-strong))",
          border: "1px solid var(--border-strong)",
        }}
        aria-label={`${title} audio artwork`}
        role="img"
      >
        {thumbnail ? (
          <img
            src={thumbnail}
            alt=""
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-30 blur-md"
          />
        ) : null}
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div
            className="relative flex aspect-square w-20 max-w-full items-center justify-center overflow-hidden rounded-xl"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border-strong)",
              boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
            }}
          >
            {thumbnail ? (
              <img src={thumbnail} alt="" className="h-full w-full object-cover" />
            ) : (
              <Disc3 size={34} style={{ color: "var(--foreground-soft)" }} aria-hidden="true" />
            )}
            <span
              className="absolute bottom-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full"
              style={{ background: "rgba(0,0,0,0.72)", color: "#fff" }}
            >
              <FileAudio size={14} aria-hidden="true" />
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative aspect-video overflow-hidden rounded-lg"
      style={{
        background: "var(--surface-muted)",
        border: "1px solid var(--border-strong)",
      }}
      aria-label={`${title} thumbnail`}
      role="img"
    >
      {thumbnail ? (
        <img src={thumbnail} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Download size={32} style={{ color: "var(--foreground-subtle)" }} aria-hidden="true" />
        </div>
      )}
      {duration ? (
        <span
          className="absolute bottom-2 right-2 rounded-md px-2 py-1 text-[11px] font-bold tabular-nums"
          style={{ background: "rgba(0,0,0,0.82)", color: "#fff" }}
        >
          {formatDuration(duration)}
        </span>
      ) : null}
    </div>
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        color: "var(--foreground-soft)",
      }}
    >
      {label}
      <strong
        className="font-mono font-semibold tabular-nums"
        style={{ color: "var(--foreground-muted)" }}
      >
        {value}
      </strong>
    </span>
  );
}

function labelForProgress(job: DownloadJob): string {
  if (job.status === "pending") return "Queued";
  if (job.status === "completed") return "Completed";
  if (job.status === "failed") return "Failed";
  if (job.status === "cancelled") return "Cancelled";
  if (job.progressStatus === "merging") return "Merging";
  if (job.progressStatus === "postprocessing") return "Post-processing";
  return "Downloading";
}

function progressColor(status: DownloadStatus): string {
  if (status === "completed") return "var(--success)";
  if (status === "failed") return "var(--error)";
  if (status === "cancelled") return "var(--foreground-soft)";
  return "var(--primary-strong)";
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

const STATUS_META = {
  pending: {
    icon: Clock3,
    color: "var(--foreground-muted)",
    background: "var(--surface)",
    border: "var(--border-strong)",
  },
  downloading: {
    icon: LoaderCircle,
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
