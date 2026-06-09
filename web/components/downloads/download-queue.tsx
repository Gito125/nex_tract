"use client";

import { LoaderCircle, Download } from "lucide-react";
import { DownloadProgressCard } from "@/components/downloads/download-progress-card";
import type { DownloadJob } from "@/lib/types";

type MutationState = { isPending: boolean; jobId: string | null };

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
      className="animate-fade-up stagger-2"
      aria-label="Download queue"
      style={{
        marginTop: "24px",
        borderRadius: "20px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-soft)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          padding: "18px 20px 16px",
          borderBottom: "1px solid var(--border-soft)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "30px",
              height: "30px",
              borderRadius: "8px",
              background: "var(--primary-soft)",
              border: "1px solid var(--border-primary)",
            }}
          >
            <Download size={14} style={{ color: "var(--primary-strong)" }} aria-hidden="true" />
          </span>
          <div>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "15px",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "var(--foreground)",
                lineHeight: 1.2,
              }}
            >
              Download Queue
            </h2>
            <p style={{ fontSize: "12px", color: "var(--foreground-muted)", marginTop: "1px" }}>
              Live progress, speed, and ETA update as each job runs.
            </p>
          </div>
        </div>

        {isLoading && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              borderRadius: "9999px",
              fontSize: "11px",
              fontWeight: 600,
              color: "var(--foreground-muted)",
              background: "var(--surface-raised)",
              border: "1px solid var(--border)",
            }}
          >
            <LoaderCircle
              size={12}
              aria-hidden="true"
              style={{ animation: "spin 0.8s linear infinite" }}
            />
            Syncing
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "16px" }}>
        {error && (
          <div
            role="alert"
            style={{
              padding: "10px 14px",
              borderRadius: "8px",
              background: "var(--error-soft)",
              border: "1px solid var(--error-border)",
              color: "var(--error)",
              fontSize: "13px",
              fontWeight: 500,
              marginBottom: "12px",
            }}
          >
            {error}
          </div>
        )}

        {jobs.length === 0 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "80px",
              borderRadius: "10px",
              background: "var(--surface-raised)",
              border: "1px dashed var(--border-strong)",
              fontSize: "13px",
              color: "var(--foreground-soft)",
              textAlign: "center",
              padding: "20px",
            }}
          >
            Downloads you start from this preview will appear here.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
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
      </div>
    </section>
  );
}
