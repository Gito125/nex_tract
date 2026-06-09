"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  CirclePlay,
  ClipboardList,
  FileVideo,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { DownloadQueue } from "@/components/downloads/download-queue";
import { MediaPreviewCard } from "@/components/downloader/media-preview-card";
import { PlaylistPreviewCard } from "@/components/downloader/playlist-preview-card";
import { UrlInputCard } from "@/components/downloader/url-input-card";
import {
  analyzeUrl,
  cancelDownload,
  createDownload,
  getDownloadEventsUrl,
  listDownloads,
  retryDownload,
} from "@/lib/api";
import type {
  AnalyzeResponse,
  AudioFormat,
  DownloadCreateRequest,
  DownloadJob,
  DownloadQueueResponse,
  QualityValue,
} from "@/lib/types";

export function AnalyzeHome() {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [selectedQuality, setSelectedQuality] = useState<QualityValue | null>(null);
  const [cancelJobId, setCancelJobId] = useState<string | null>(null);
  const [retryJobId, setRetryJobId] = useState<string | null>(null);

  const analyzeMutation = useMutation({
    mutationFn: analyzeUrl,
    onSuccess: (data) => {
      setAnalysis(data);
      setSelectedQuality(data.qualities[0]?.value ?? null);
    },
  });

  const downloadsQuery = useQuery({
    queryKey: ["downloads"],
    queryFn: listDownloads,
    refetchInterval: 2_000,
  });

  const activeJobIds = (downloadsQuery.data?.jobs ?? [])
    .filter((job) => job.status === "pending" || job.status === "downloading")
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

    return () => {
      sources.forEach((source) => source.close());
    };
  }, [activeJobIds, queryClient]);

  const createDownloadMutation = useMutation({
    mutationFn: createDownload,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["downloads"] });
    },
  });

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

  const visibleError =
    clientError ?? (analyzeMutation.error ? analyzeMutation.error.message : null);
  const queueError =
    createDownloadMutation.error?.message ??
    cancelMutation.error?.message ??
    retryMutation.error?.message ??
    (downloadsQuery.error ? downloadsQuery.error.message : null);

  function handleSubmit(value: string) {
    const trimmed = value.trim();
    setClientError(null);
    setAnalysis(null);
    setSelectedQuality(null);

    if (!trimmed) {
      setClientError("Paste a YouTube URL to get started.");
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(trimmed);
    } catch {
      setClientError("Enter a full URL — e.g. https://youtube.com/watch?v=…");
      return;
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      setClientError("Only web links (http/https) are supported.");
      return;
    }

    analyzeMutation.mutate(trimmed);
  }

  function resetAnalysis() {
    setAnalysis(null);
    setSelectedQuality(null);
    setClientError(null);
    analyzeMutation.reset();
    createDownloadMutation.reset();
  }

  function handleDownload() {
    if (!analysis || !selectedQuality) return;

    if (!confirmRepeatDownload(analysis, selectedQuality, downloadsQuery.data?.jobs ?? [])) {
      return;
    }

    createDownloadMutation.reset();
    createDownloadMutation.mutate(
      toDownloadRequest(analysis.webpageUrl, selectedQuality),
    );
  }

  if (analysis?.type === "video") {
    return (
      <div className="mx-auto w-full max-w-7xl px-6 py-8 sm:px-8 lg:px-12 lg:py-12 animate-fade-up">
        <MediaPreviewCard
          downloadError={createDownloadMutation.error?.message ?? null}
          isDownloadPending={createDownloadMutation.isPending}
          onBack={resetAnalysis}
          onDownload={handleDownload}
          onSelectQuality={setSelectedQuality}
          preview={analysis}
          selectedQuality={selectedQuality}
        />
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

  if (analysis?.type === "playlist") {
    return (
      <div className="mx-auto w-full max-w-7xl px-6 py-8 sm:px-8 lg:px-12 lg:py-12 animate-fade-up">
        <PlaylistPreviewCard onBack={resetAnalysis} preview={analysis} />
      </div>
    );
  }

  return (
    <div
      className="relative flex min-h-screen flex-col"
      style={{ overflow: "hidden" }}
    >
      {/* Ambient background glow */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "-120px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "800px",
          height: "500px",
          borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(91,79,255,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Hero */}
      <section
        className="mx-auto flex w-full max-w-5xl flex-col items-center justify-center px-6 pt-16 pb-12 sm:px-8 lg:px-12 lg:pt-24 lg:pb-16 text-center animate-fade-up"
        style={{ flex: 1 }}
      >
        {/* Eyebrow */}
        <span
          className="mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest"
          style={{
            background: "var(--primary-soft)",
            border: "1px solid var(--border-primary)",
            color: "var(--primary-strong)",
          }}
        >
          <Sparkles size={11} aria-hidden="true" />
          Local-first · Privacy native
        </span>

        {/* Headline */}
        <h1
          className="mb-5 max-w-3xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl"
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            color: "var(--foreground)",
            letterSpacing: "-0.03em",
          }}
        >
          Your media.{" "}
          <span
            style={{
              background: "linear-gradient(135deg, var(--primary-strong), var(--accent))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Your vault.
          </span>
        </h1>

        <p
          className="mb-10 max-w-xl text-lg leading-relaxed"
          style={{ color: "var(--foreground-muted)" }}
        >
          Paste a link, pick your quality, and archive videos, audio, and playlists — offline, on your machine, in seconds.
        </p>

        {/* Input */}
        <div className="w-full max-w-3xl">
          <UrlInputCard
            error={visibleError}
            isLoading={analyzeMutation.isPending}
            onSubmit={handleSubmit}
            onUrlChange={(value) => {
              setUrl(value);
              setClientError(null);
              if (analyzeMutation.error) analyzeMutation.reset();
            }}
            url={url}
          />
        </div>

        {analyzeMutation.isPending && (
          <p
            className="mt-5 text-sm font-medium animate-fade-up"
            role="status"
            style={{ color: "var(--foreground-muted)" }}
          >
            Fetching metadata and available formats…
          </p>
        )}

        {/* Capability chips */}
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <CapabilityChip icon={CirclePlay} label="YouTube" color="var(--error)" />
          <CapabilityChip icon={FileVideo} label="Video" color="var(--primary-strong)" />
          <CapabilityChip icon={Archive} label="Audio" color="var(--success)" />
          <CapabilityChip icon={ClipboardList} label="Playlists" color="var(--accent)" />
        </div>
      </section>

      {/* Recent Activity */}
      <section
        className="mx-auto w-full max-w-4xl px-6 pb-12 sm:px-8 lg:px-12"
        aria-label="Recent activity"
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2
            className="text-xl font-bold"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: "var(--foreground)" }}
          >
            Recent Activity
          </h2>
          <button
            aria-disabled="true"
            className="text-xs font-bold uppercase tracking-widest transition-opacity opacity-50 cursor-default"
            style={{ color: "var(--primary-strong)" }}
            type="button"
          >
            View All
          </button>
        </div>

        <div
          className="flex min-h-36 flex-col items-center justify-center rounded-2xl px-6 py-10 text-center"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          {/* Empty state icon cluster */}
          <div
            className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ background: "var(--surface-strong)", border: "1px solid var(--border-strong)" }}
          >
            <Archive size={22} style={{ color: "var(--foreground-soft)" }} aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold mb-1" style={{ color: "var(--foreground)" }}>
            Vault is empty
          </p>
          <p className="max-w-xs text-sm leading-6" style={{ color: "var(--foreground-muted)" }}>
            Paste a YouTube link above to start archiving content.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="mx-auto max-w-3xl w-full px-6 pb-12 pt-6 text-center text-xs leading-6 sm:px-8"
        style={{
          borderTop: "1px solid var(--border-soft)",
          color: "var(--foreground-soft)",
        }}
      >
        Nextract is intended for archiving personal or permitted content. Respect copyright and platform terms.
      </footer>
    </div>
  );
}

function toDownloadRequest(
  url: string,
  quality: QualityValue,
): DownloadCreateRequest {
  const audioFormat = audioFormatForQuality(quality);

  if (audioFormat) {
    return {
      url,
      quality,
      downloadType: "audio",
      audioFormat,
    };
  }

  return {
    url,
    quality,
    downloadType: "video",
    audioFormat: null,
  };
}

function audioFormatForQuality(quality: QualityValue): AudioFormat | null {
  if (quality === "audio_m4a") return "m4a";
  if (quality === "audio_mp3") return "mp3";
  if (quality === "audio_opus") return "opus";
  return null;
}

function confirmRepeatDownload(
  analysis: AnalyzeResponse,
  selectedQuality: QualityValue,
  jobs: DownloadJob[],
): boolean {
  const matchingJobs = jobs.filter(
    (job) =>
      job.url === analysis.webpageUrl &&
      job.status !== "failed" &&
      job.status !== "cancelled",
  );

  if (matchingJobs.length === 0) return true;

  const sameQuality = matchingJobs.some(
    (job) => job.selectedQuality === selectedQuality,
  );

  if (sameQuality) {
    return window.confirm(
      `You already have ${formatQualityLabel(selectedQuality)} for this video. Download it again?`,
    );
  }

  const existingQualities = Array.from(
    new Set(matchingJobs.map((job) => formatQualityLabel(job.selectedQuality))),
  ).join(", ");

  return window.confirm(
    `This video is already in your queue or vault as ${existingQualities}. Download ${formatQualityLabel(selectedQuality)} too?`,
  );
}

function formatQualityLabel(quality: QualityValue): string {
  return quality.replaceAll("_", " ");
}

function upsertDownloadJob(
  current: DownloadQueueResponse | undefined,
  job: DownloadJob,
): DownloadQueueResponse {
  if (!current) return { jobs: [job] };

  const existingIndex = current.jobs.findIndex((item) => item.id === job.id);
  if (existingIndex === -1) {
    return { jobs: [job, ...current.jobs] };
  }

  return {
    jobs: current.jobs.map((item, index) => (index === existingIndex ? job : item)),
  };
}

function CapabilityChip({
  icon: Icon,
  label,
  color,
}: {
  icon: LucideIcon;
  label: string;
  color: string;
}) {
  return (
    <span
      className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border-strong)",
        color: "var(--foreground-muted)",
      }}
    >
      <Icon size={14} aria-hidden style={{ color }} />
      {label}
    </span>
  );
}
