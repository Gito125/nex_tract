"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { DownloadQueue } from "@/components/downloads/download-queue";
import { cancelDownload, getDownloadEventsUrl, listDownloads, retryDownload } from "@/lib/api";
import type { DownloadJob, DownloadQueueResponse } from "@/lib/types";

export default function QueuePage() {
  const queryClient = useQueryClient();
  const [cancelJobId, setCancelJobId] = useState<string | null>(null);
  const [retryJobId, setRetryJobId] = useState<string | null>(null);

  const downloadsQuery = useQuery({
    queryKey: ["downloads"],
    queryFn: listDownloads,
    refetchInterval: 2_000,
  });

  const activeJobIds = (downloadsQuery.data?.jobs ?? [])
    .filter((job) => job.status === "downloading")
    .map((job) => job.id)
    .join("|");

  useEffect(() => {
    if (!activeJobIds) return;
    const sources = activeJobIds.split("|").map((jobId) => {
      const source = new EventSource(getDownloadEventsUrl(jobId));
      source.onmessage = (event) => {
        try {
          const job = JSON.parse(event.data) as DownloadJob;
          queryClient.setQueryData<DownloadQueueResponse>(
            ["downloads"],
            (current) => upsertDownloadJob(current, job),
          );
        } catch {
          queryClient.invalidateQueries({ queryKey: ["downloads"] });
        }
      };
      source.onerror = () => {
        source.close();
        queryClient.invalidateQueries({ queryKey: ["downloads"] });
      };
      return source;
    });
    return () => sources.forEach((s) => s.close());
  }, [activeJobIds, queryClient]);

  const cancelMutation = useMutation({
    mutationFn: cancelDownload,
    onMutate: (jobId) => setCancelJobId(jobId),
    onSettled: () => {
      setCancelJobId(null);
      queryClient.invalidateQueries({ queryKey: ["downloads"] });
    },
  });

  const retryMutation = useMutation({
    mutationFn: retryDownload,
    onMutate: (jobId) => setRetryJobId(jobId),
    onSettled: () => {
      setRetryJobId(null);
      queryClient.invalidateQueries({ queryKey: ["downloads"] });
    },
  });

  const queueError =
    cancelMutation.error?.message ??
    retryMutation.error?.message ??
    (downloadsQuery.error ? downloadsQuery.error.message : null);

  return (
    <div
      className="animate-fade-up"
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "32px 24px 64px",
      }}
    >
      <div style={{ marginBottom: "24px", padding: "0 16px" }}>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "28px",
            fontWeight: 800,
            color: "var(--foreground)",
            letterSpacing: "-0.02em",
          }}
        >
          Download Queue
        </h1>
        <p style={{ color: "var(--foreground-muted)", marginTop: "4px", fontSize: "15px" }}>
          Manage your active and pending downloads.
        </p>
      </div>

      <DownloadQueue
        cancelState={{ isPending: cancelMutation.isPending, jobId: cancelJobId }}
        error={queueError}
        isLoading={downloadsQuery.isLoading}
        jobs={downloadsQuery.data?.jobs ?? []}
        onCancel={(jobId) => cancelMutation.mutate(jobId)}
        onRetry={(jobId) => retryMutation.mutate(jobId)}
        retryState={{ isPending: retryMutation.isPending, jobId: retryJobId }}
      />
    </div>
  );
}

function upsertDownloadJob(
  current: DownloadQueueResponse | undefined,
  job: DownloadJob,
): DownloadQueueResponse {
  if (!current) return { jobs: [job] };
  const idx = current.jobs.findIndex((item) => item.id === job.id);
  if (idx === -1) return { jobs: [job, ...current.jobs] };
  return { jobs: current.jobs.map((item, i) => (i === idx ? job : item)) };
}
