"use client";

import { useEffect, useRef, useState } from "react";
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
  FolderOpen,
} from "lucide-react";
import { platformLabel } from "@/lib/platforms";
import { isTauri } from "@/lib/env";
import { getDownloadStreamUrl } from "@/lib/api";
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
  const hasAutoDownloaded = useRef(false);

  useEffect(() => {
    if (job.status === "completed" && !isTauri() && !hasAutoDownloaded.current) {
      hasAutoDownloaded.current = true;
      const url = getDownloadStreamUrl(job.id);
      const a = document.createElement("a");
      a.href = url;
      a.download = "";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }, [job.status, job.id]);

  const canCancel = job.status === "pending" || job.status === "downloading";
  const canRetry  = job.status === "failed"  || job.status === "cancelled";
  const isAudio   = job.selectedQuality.startsWith("audio_");
  const isImage   = job.mediaType === "image" || job.mediaType === "gallery";
  const meta      = STATUS_META[job.status];
  const Icon      = meta.icon;

  const progressLabel = labelForProgress(job);
  const progressPct   = Math.max(0, Math.min(job.progress, 100));
  const pColor        = progressColor(job.status);

  /* card border accent */
  const borderStyle =
    job.status === "failed"    ? "1px solid var(--error-border)" :
    job.status === "completed" ? "1px solid var(--success-border)" :
    job.status === "downloading" ? "1px solid var(--border-primary)" :
    "1px solid var(--border)";

  return (
    <article
      className="download-progress-card"
      style={{
        gap: "14px",
        padding: "16px",
        borderRadius: "14px",
        background: "var(--surface-raised)",
        border: borderStyle,
        transition: "border 0.3s",
      }}
    >
      {/* Thumbnail */}
      <MediaThumb
        duration={job.duration}
        isAudio={isAudio}
        isImage={isImage}
        mediaLabel={job.mediaType === "gallery" ? "Gallery" : "Image"}
        thumbnail={job.thumbnail}
        title={job.title}
      />

      {/* Content */}
      <div style={{ minWidth: 0 }}>
        {/* Top row: badges + percentage */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px", marginBottom: "8px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {/* Status badge */}
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "4px 10px",
                borderRadius: "9999px",
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "capitalize",
                background: meta.background,
                color: meta.color,
                border: `1px solid ${meta.border}`,
              }}
            >
              <Icon
                size={12}
                aria-hidden="true"
                style={{ animation: job.status === "downloading" ? "spin 0.8s linear infinite" : "none" }}
              />
              {job.status}
            </span>

            {/* Quality pill */}
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "4px 9px",
                borderRadius: "9999px",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.04em",
                background: "var(--surface)",
                border: "1px solid var(--border-strong)",
                color: "var(--foreground-soft)",
                textTransform: "uppercase",
              }}
            >
              {job.selectedQuality.replaceAll("_", " ")}
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "4px 9px",
                borderRadius: "9999px",
                fontSize: "11px",
                fontWeight: 700,
                background: "var(--surface)",
                border: "1px solid var(--border-strong)",
                color: "var(--foreground-soft)",
              }}
            >
              {platformLabel(job.platform)}
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "4px 9px",
                borderRadius: "9999px",
                fontSize: "11px",
                fontWeight: 700,
                background: "var(--surface)",
                border: "1px solid var(--border-strong)",
                color: "var(--foreground-soft)",
                textTransform: "capitalize",
              }}
            >
              {job.mediaType}
            </span>
          </div>

          {/* Percentage */}
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "13px",
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
              color: pColor,
              flexShrink: 0,
            }}
            aria-label={`${job.progress}% complete`}
          >
            {progressPct}%
          </span>
        </div>

        {/* Title */}
        <h3
          style={{
            fontSize: "14px",
            fontWeight: 600,
            lineHeight: 1.4,
            color: "var(--foreground)",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            marginBottom: "12px",
          }}
          title={job.title}
        >
          {job.title}
        </h3>

        {/* Progress bar */}
        <div
          className="ui-progress"
          style={{ marginBottom: "10px" }}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPct}
          aria-label={progressLabel}
        >
          <div
            className="ui-progress__bar"
            style={{
              width: `${progressPct}%`,
              background: pColor,
            }}
          />
        </div>

        {/* Metrics row */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "6px" }}>
          <MetricPill label="Phase" value={progressLabel} />
          <MetricPill label="Speed" value={job.speed ?? "—"} />
          <MetricPill label="ETA"   value={job.eta   ?? "—"} />
          {job.fileSize ? <MetricPill label="Size" value={formatBytes(job.fileSize)} /> : null}
        </div>

        {/* File path */}
        {job.outputPath && job.status === "completed" && (
          <p
            style={{
              fontSize: "11px",
              color: "var(--success)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              marginTop: "4px",
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
            title={job.outputPath}
          >
            <FolderOpen size={12} aria-hidden="true" />
            {job.outputPath}
          </p>
        )}

        {/* Error */}
        {job.errorMessage && (
          <p
            style={{ fontSize: "12px", fontWeight: 500, color: "var(--error)", marginTop: "6px" }}
          >
            {job.errorMessage}
          </p>
        )}

        {/* Actions */}
        <div className="download-progress-actions">
          {canCancel && (
            <ActionBtn
              disabled={cancelState.isPending && cancelState.jobId === job.id}
              icon={Square}
              label="Cancel"
              onClick={() => onCancel(job.id)}
            />
          )}
          {canRetry && (
            <ActionBtn
              disabled={retryState.isPending && retryState.jobId === job.id}
              icon={RotateCcw}
              label="Retry"
              onClick={() => onRetry(job.id)}
              primary
            />
          )}
        </div>
      </div>
    </article>
  );
}

/* ── Thumbnail ───────────────────────────────────────────────── */
function MediaThumb({
  duration,
  isAudio,
  isImage,
  mediaLabel,
  thumbnail,
  title,
}: {
  duration: number | null;
  isAudio: boolean;
  isImage: boolean;
  mediaLabel: string;
  thumbnail: string | null;
  title: string;
}) {
  const [failedThumbnail, setFailedThumbnail] = useState<string | null>(null);
  const usableThumbnail = thumbnail && failedThumbnail !== thumbnail ? thumbnail : null;

  const base: React.CSSProperties = {
    width: "100px",
    borderRadius: "10px",
    overflow: "hidden",
    border: "1px solid var(--border-strong)",
    flexShrink: 0,
    position: "relative",
    aspectRatio: "16/9",
    background: "var(--surface-muted)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  if (isAudio) {
    return (
      <div className="download-thumb" style={{ ...base, background: "linear-gradient(145deg, var(--surface-muted), var(--surface-strong))" }} role="img" aria-label={`${title} audio`}>
        {usableThumbnail && (
          <img
            src={usableThumbnail}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setFailedThumbnail(usableThumbnail)}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.25, filter: "blur(8px)", transform: "scale(1.1)" }}
          />
        )}
        <div style={{ position: "relative" }}>
          {usableThumbnail ? (
            <img
              src={usableThumbnail}
              alt=""
              referrerPolicy="no-referrer"
              onError={() => setFailedThumbnail(usableThumbnail)}
              style={{ width: "44px", height: "44px", borderRadius: "8px", objectFit: "cover" }}
            />
          ) : (
            <Disc3 size={30} style={{ color: "var(--foreground-soft)" }} aria-hidden="true" />
          )}
        </div>
        <span
          style={{
            position: "absolute",
            bottom: "4px",
            right: "4px",
            background: "var(--overlay-soft)",
            color: "var(--on-primary)",
            borderRadius: "4px",
            padding: "2px 5px",
            fontSize: "9px",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: "3px",
          }}
        >
          <FileAudio size={9} aria-hidden="true" />
        </span>
      </div>
    );
  }

  return (
    <div className="download-thumb" style={base} role="img" aria-label={`${title} thumbnail`}>
      {usableThumbnail ? (
        <img
          src={usableThumbnail}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailedThumbnail(usableThumbnail)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <Download size={24} style={{ color: "var(--foreground-subtle)" }} aria-hidden="true" />
      )}
      {isImage && (
        <span
          style={{
            position: "absolute",
            bottom: "4px",
            left: "4px",
            background: "var(--overlay-strong)",
            color: "var(--on-primary)",
            borderRadius: "4px",
            padding: "2px 5px",
            fontSize: "10px",
            fontWeight: 700,
          }}
        >
          {mediaLabel}
        </span>
      )}
      {duration && !isImage && (
        <span
          style={{
            position: "absolute",
            bottom: "4px",
            right: "4px",
            background: "var(--overlay-strong)",
            color: "var(--on-primary)",
            borderRadius: "4px",
            padding: "2px 5px",
            fontSize: "10px",
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {formatDuration(duration)}
        </span>
      )}
    </div>
  );
}

/* ── Metric pill ─────────────────────────────────────────────── */
function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "3px 8px",
        borderRadius: "6px",
        fontSize: "11px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        color: "var(--foreground-soft)",
      }}
    >
      {label}
      <strong style={{ fontWeight: 600, color: "var(--foreground-muted)", fontVariantNumeric: "tabular-nums" }}>
        {value}
      </strong>
    </span>
  );
}

/* ── Action button ───────────────────────────────────────────── */
function ActionBtn({
  disabled,
  icon: Icon,
  label,
  onClick,
  primary,
}: {
  disabled?: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        minHeight: "44px",
        padding: "0 12px",
        borderRadius: "8px",
        border: primary ? "none" : "1px solid var(--border-strong)",
        background: primary ? "var(--primary)" : "var(--surface)",
        color: primary ? "var(--on-primary)" : "var(--foreground-muted)",
        fontSize: "12px",
        fontWeight: 700,
        cursor: disabled ? "wait" : "pointer",
        opacity: disabled ? 0.6 : 1,
        fontFamily: "var(--font-body)",
        transition: "all 0.15s",
        boxShadow: primary ? "0 2px 8px var(--primary-glow)" : "none",
      }}
    >
      <Icon size={13} aria-hidden="true" />
      {label}
    </button>
  );
}

/* ── Helpers ─────────────────────────────────────────────────── */
function labelForProgress(job: DownloadJob): string {
  if (job.status === "pending")   return "Queued";
  if (job.status === "completed") return "Done";
  if (job.status === "failed")    return "Failed";
  if (job.status === "cancelled") return "Cancelled";
  if (job.progressStatus === "merging")          return "Merging";
  if (job.progressStatus === "postprocessing")   return "Processing";
  return "Downloading";
}

function progressColor(status: DownloadStatus): string {
  if (status === "completed")   return "var(--success)";
  if (status === "failed")      return "var(--error)";
  if (status === "cancelled")   return "var(--foreground-soft)";
  if (status === "downloading") return "var(--primary)";
  return "var(--foreground-subtle)";
}

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes, i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toLocaleString(undefined, { maximumFractionDigits: v >= 10 || i === 0 ? 0 : 1 })} ${units[i]}`;
}

const STATUS_META: Record<DownloadStatus, { icon: LucideIcon; color: string; background: string; border: string }> = {
  pending: {
    icon: Clock3,
    color: "var(--foreground-muted)",
    background: "var(--surface-strong)",
    border: "var(--border-strong)",
  },
  downloading: {
    icon: LoaderCircle,
    color: "var(--primary-strong)",
    background: "var(--primary-muted)",
    border: "var(--border-primary)",
  },
  completed: {
    icon: CheckCircle2,
    color: "var(--success)",
    background: "var(--success-soft)",
    border: "var(--success-border)",
  },
  failed: {
    icon: XCircle,
    color: "var(--error)",
    background: "var(--error-soft)",
    border: "var(--error-border)",
  },
  cancelled: {
    icon: Square,
    color: "var(--foreground-soft)",
    background: "var(--surface-strong)",
    border: "var(--border-strong)",
  },
};
