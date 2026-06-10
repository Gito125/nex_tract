"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  Camera,
  CirclePlay,
  ClipboardList,
  FileAudio,
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
  cancelPlaylist,
  createPlaylist,
  createDownload,
  estimatePlaylistSizes,
  getSettings,
  getDownloadEventsUrl,
  getPlaylistEventsUrl,
  listDownloads,
  retryDownload,
} from "@/lib/api";
import type {
  AnalyzeResponse,
  AudioFormat,
  DownloadCreateRequest,
  DownloadJob,
  DownloadQueueResponse,
  PlaylistCreateRequest,
  PlaylistSizeEstimateRequest,
  PlaylistResponse,
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
  const [playlist, setPlaylist] = useState<PlaylistResponse | null>(null);
  const [repeatDownload, setRepeatDownload] = useState<{
    message: string;
    request: DownloadCreateRequest;
  } | null>(null);

  const settingsQuery = useQuery({ queryKey: ["settings"], queryFn: getSettings });

  const analyzeMutation = useMutation({
    mutationFn: analyzeUrl,
    onSuccess: (data) => {
      setAnalysis(data);
      setSelectedQuality(selectDefaultQuality(data, settingsQuery.data));
    },
  });

  const downloadsQuery = useQuery({
    queryKey: ["downloads"],
    queryFn: listDownloads,
    refetchInterval: 2_000,
  });

  const activeJobIds = (downloadsQuery.data?.jobs ?? [])
    .filter((job) => job.status === "downloading")
    .map((job) => job.id)
    .join("|");
  const activePlaylistId =
    playlist && ["pending", "downloading"].includes(playlist.status)
      ? playlist.id
      : null;

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

  useEffect(() => {
    if (!activePlaylistId) return;

    const source = new EventSource(getPlaylistEventsUrl(activePlaylistId));
    source.onmessage = (event) => {
      try {
        setPlaylist(JSON.parse(event.data) as PlaylistResponse);
      } catch {
        source.close();
      }
    };
    source.onerror = () => {
      source.close();
    };
    return () => source.close();
  }, [activePlaylistId]);

  const createDownloadMutation = useMutation({
    mutationFn: createDownload,
    onSuccess: () => {
      setRepeatDownload(null);
      queryClient.invalidateQueries({ queryKey: ["downloads"] });
    },
  });

  const createPlaylistMutation = useMutation({
    mutationFn: createPlaylist,
    onSuccess: (data) => setPlaylist(data),
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

  const cancelPlaylistMutation = useMutation({
    mutationFn: cancelPlaylist,
    onSuccess: (data) => setPlaylist(data),
  });

  const estimatePlaylistSizesMutation = useMutation({
    mutationFn: estimatePlaylistSizes,
  });

  const visibleError =
    clientError ?? (analyzeMutation.error ? analyzeMutation.error.message : null);
  const queueError =
    createDownloadMutation.error?.message ??
    cancelMutation.error?.message ??
    retryMutation.error?.message ??
    cancelPlaylistMutation.error?.message ??
    (downloadsQuery.error ? downloadsQuery.error.message : null);

  function handleSubmit(value: string) {
    const trimmed = value.trim();
    setClientError(null);
    setAnalysis(null);
    setSelectedQuality(null);
    setPlaylist(null);
    setRepeatDownload(null);
    if (!trimmed) { setClientError("Paste a supported media URL to get started."); return; }
    let parsedUrl: URL;
    try { parsedUrl = new URL(trimmed); } catch {
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
    setPlaylist(null);
    setRepeatDownload(null);
    setClientError(null);
    analyzeMutation.reset();
    createDownloadMutation.reset();
    createPlaylistMutation.reset();
    cancelPlaylistMutation.reset();
    estimatePlaylistSizesMutation.reset();
  }

  function handleDownload() {
    if (!analysis || !selectedQuality) return;
    const request = toDownloadRequest(analysis.webpageUrl, selectedQuality);
    const repeatMessage = getRepeatDownloadMessage(
      analysis,
      selectedQuality,
      downloadsQuery.data?.jobs ?? [],
    );
    if (repeatMessage) {
      setRepeatDownload({ message: repeatMessage, request });
      return;
    }
    createDownloadMutation.reset();
    createDownloadMutation.mutate(request);
  }

  function handlePlaylistStart(
    options: Pick<
      PlaylistCreateRequest,
      "selectedIndexes" | "rangeStart" | "rangeEnd" | "skipExisting"
    >,
  ) {
    if (!analysis || !selectedQuality) return;
    setPlaylist(null);
    createPlaylistMutation.reset();
    cancelPlaylistMutation.reset();
    createPlaylistMutation.mutate(
      toPlaylistRequest(analysis.webpageUrl, selectedQuality, options),
    );
  }

  function handlePlaylistSizeEstimate(
    request: PlaylistSizeEstimateRequest,
  ) {
    estimatePlaylistSizesMutation.reset();
    estimatePlaylistSizesMutation.mutate(request);
  }

  if (analysis && ["video", "image", "gallery"].includes(analysis.type)) {
    return (
      <div
        className="animate-fade-up"
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "32px 24px 48px",
        }}
      >
        <AnalyzeNotice message={analysis.notice} />
        <MediaPreviewCard
          downloadError={createDownloadMutation.error?.message ?? null}
          isDownloadPending={createDownloadMutation.isPending}
          onBack={resetAnalysis}
          onDownload={handleDownload}
          onSelectQuality={(quality) => {
            setSelectedQuality(quality);
            setRepeatDownload(null);
          }}
          preview={analysis}
          selectedQuality={selectedQuality}
        />
        {repeatDownload && (
          <RepeatDownloadNotice
            isPending={createDownloadMutation.isPending}
            message={repeatDownload.message}
            onCancel={() => setRepeatDownload(null)}
            onConfirm={() => {
              createDownloadMutation.reset();
              createDownloadMutation.mutate(repeatDownload.request);
            }}
          />
        )}
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
      <div
        className="animate-fade-up"
        style={{ maxWidth: "1180px", margin: "0 auto", padding: "32px 24px 48px" }}
      >
        <AnalyzeNotice message={analysis.notice} />
        <PlaylistPreviewCard
          defaultSkipExisting={settingsQuery.data?.skipExisting ?? false}
          isCancelPending={cancelPlaylistMutation.isPending}
          isEstimatePending={estimatePlaylistSizesMutation.isPending}
          isStartPending={createPlaylistMutation.isPending}
          sizeEstimate={estimatePlaylistSizesMutation.data ?? null}
          sizeEstimateError={estimatePlaylistSizesMutation.error?.message ?? null}
          onBack={resetAnalysis}
          onCancel={() => {
            if (playlist) cancelPlaylistMutation.mutate(playlist.id);
          }}
          onEstimateSizes={handlePlaylistSizeEstimate}
          onSelectQuality={setSelectedQuality}
          onStart={handlePlaylistStart}
          playlist={playlist}
          preview={analysis}
          selectedQuality={selectedQuality}
          startError={createPlaylistMutation.error?.message ?? null}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Hero section */}
      <section
        className="animate-fade-up"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "72px 24px 56px",
          maxWidth: "860px",
          margin: "0 auto",
          width: "100%",
          position: "relative",
          zIndex: 1,
          textAlign: "center",
        }}
      >
        {/* Eyebrow badge */}
        <div
          className="animate-fade-up stagger-1"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "5px 14px",
            borderRadius: "9999px",
            background: "var(--primary-soft)",
            border: "1px solid var(--border-primary)",
            color: "var(--primary-strong)",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            marginBottom: "28px",
          }}
        >
          <Sparkles size={11} aria-hidden="true" />
          Local-first · Privacy native
        </div>

        {/* Headline */}
        <h1
          className="animate-fade-up stagger-2"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(34px, 5vw, 56px)",
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: "-0.035em",
            color: "var(--foreground)",
            marginBottom: "20px",
            maxWidth: "700px",
          }}
        >
          Your media.{" "}
          <span
            style={{
              color: "var(--primary)",
            }}
          >
            Your vault.
          </span>
        </h1>

        {/* Subtext */}
        <p
          className="animate-fade-up stagger-3"
          style={{
            fontSize: "17px",
            lineHeight: 1.65,
            color: "var(--foreground-muted)",
            maxWidth: "520px",
            marginBottom: "44px",
            fontWeight: 400,
          }}
        >
          Paste a supported link, pick your quality, and archive permitted videos,
          audio, and YouTube playlists offline on your machine.
        </p>

        {/* Input */}
        <div className="animate-fade-up stagger-4" style={{ width: "100%", maxWidth: "680px" }}>
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

        {/* Analyzing state */}
        {analyzeMutation.isPending && (
          <p
            className="animate-fade-in"
            role="status"
            style={{
              marginTop: "16px",
              fontSize: "13px",
              fontWeight: 500,
              color: "var(--foreground-soft)",
            }}
          >
            Fetching metadata and available formats…
          </p>
        )}

        {/* Platform chips */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "10px",
            marginTop: "36px",
          }}
        >
          {CHIPS.map((chip, i) => (
            <PlatformChip key={chip.label} {...chip} delay={i * 50} />
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          textAlign: "center",
          padding: "24px 24px 40px",
          borderTop: "1px solid var(--border-soft)",
          fontSize: "12px",
          color: "var(--foreground-subtle)",
          lineHeight: 1.6,
          position: "relative",
          zIndex: 1,
        }}
      >
        Nextract is for archiving personal or permitted content.
        Download only media you own or have the right to save. Respect copyright.
      </footer>
    </div>
  );
}

function AnalyzeNotice({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div
      className="ui-notice ui-notice--info"
      role="status"
      style={{
        marginBottom: "14px",
      }}
    >
      {message}
    </div>
  );
}

function RepeatDownloadNotice({
  isPending,
  message,
  onCancel,
  onConfirm,
}: {
  isPending: boolean;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="ui-card animate-fade-up"
      role="status"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        marginTop: "16px",
        padding: "16px",
      }}
    >
      <div>
        <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--foreground)", marginBottom: "4px" }}>
          Download already exists
        </p>
        <p style={{ fontSize: "13px", color: "var(--foreground-muted)", lineHeight: 1.5 }}>
          {message}
        </p>
      </div>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
        <button className="ui-button" type="button" onClick={onCancel} disabled={isPending}>
          Cancel
        </button>
        <button className="ui-button ui-button--primary" type="button" onClick={onConfirm} disabled={isPending}>
          {isPending ? "Starting..." : "Download again"}
        </button>
      </div>
    </div>
  );
}

/* ── Platform chips ──────────────────────────────────────────────── */
const CHIPS = [
  { icon: CirclePlay, label: "YouTube", color: "#FF4444" },
  { icon: FileAudio, label: "TikTok", color: "var(--success)" },
  { icon: Camera, label: "Instagram", color: "#B83280" },
  { icon: Archive, label: "X", color: "var(--foreground)" },
  { icon: ClipboardList, label: "YouTube playlists", color: "var(--accent)" },
];

function PlatformChip({
  icon: Icon,
  label,
  color,
  delay,
}: {
  icon: LucideIcon;
  label: string;
  color: string;
  delay?: number;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "7px",
        padding: "7px 14px",
        borderRadius: "9999px",
        background: "var(--surface)",
        border: "1px solid var(--border-strong)",
        fontSize: "12px",
        fontWeight: 600,
        color: "var(--foreground-muted)",
        animationDelay: `${(delay ?? 0) + 280}ms`,
      }}
      className="animate-fade-up"
    >
      <Icon size={13} aria-hidden style={{ color }} />
      {label}
    </span>
  );
}

/* ── Helpers ────────────────────────────────────────────────────── */
function toDownloadRequest(url: string, quality: QualityValue): DownloadCreateRequest {
  if (quality === "image_original") {
    return { url, quality, downloadType: "image", audioFormat: null };
  }
  const audioFormat = audioFormatForQuality(quality);
  if (audioFormat) return { url, quality, downloadType: "audio", audioFormat };
  return { url, quality, downloadType: "video", audioFormat: null };
}

function toPlaylistRequest(
  url: string,
  quality: QualityValue,
  options: Pick<
    PlaylistCreateRequest,
    "selectedIndexes" | "rangeStart" | "rangeEnd" | "skipExisting"
  >,
): PlaylistCreateRequest {
  const audioFormat = audioFormatForQuality(quality);
  return {
    url,
    quality,
    downloadType: audioFormat ? "audio" : "video",
    audioFormat,
    ...options,
  };
}

function audioFormatForQuality(quality: QualityValue): AudioFormat | null {
  if (quality === "audio_m4a") return "m4a";
  if (quality === "audio_mp3") return "mp3";
  if (quality === "audio_opus") return "opus";
  return null;
}

function selectDefaultQuality(
  analysis: AnalyzeResponse,
  settings: { defaultQuality: string; defaultAudioFormat: string } | undefined,
): QualityValue | null {
  const available = new Set(analysis.qualities.map((o) => o.value));
  const preferred =
    settings?.defaultQuality === "audio"
      ? (`audio_${settings.defaultAudioFormat}` as QualityValue)
      : (settings?.defaultQuality as QualityValue | undefined);
  if (preferred && available.has(preferred)) return preferred;
  return analysis.qualities[0]?.value ?? null;
}

function getRepeatDownloadMessage(
  analysis: AnalyzeResponse,
  selectedQuality: QualityValue,
  jobs: DownloadJob[],
): string | null {
  const matchingJobs = jobs.filter(
    (job) => job.url === analysis.webpageUrl && job.status !== "failed" && job.status !== "cancelled",
  );
  if (matchingJobs.length === 0) return null;
  const sameQuality = matchingJobs.some((job) => job.selectedQuality === selectedQuality);
  if (sameQuality) {
    return `You already have ${selectedQuality.replaceAll("_", " ")} for this media.`;
  }
  const existing = Array.from(new Set(matchingJobs.map((j) => j.selectedQuality.replaceAll("_", " ")))).join(", ");
  return `This media is already in your queue as ${existing}.`;
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
