"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Archive, CirclePlay, ClipboardList, FileVideo } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { MediaPreviewCard } from "@/components/downloader/media-preview-card";
import { PlaylistPreviewCard } from "@/components/downloader/playlist-preview-card";
import { UrlInputCard } from "@/components/downloader/url-input-card";
import { analyzeUrl } from "@/lib/api";
import type { AnalyzeResponse, QualityValue } from "@/lib/types";

export function AnalyzeHome() {
  const [url, setUrl] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [selectedQuality, setSelectedQuality] = useState<QualityValue | null>(null);

  const analyzeMutation = useMutation({
    mutationFn: analyzeUrl,
    onSuccess: (data) => {
      setAnalysis(data);
      setSelectedQuality(data.qualities[0]?.value ?? null);
    },
  });

  const visibleError =
    clientError ?? (analyzeMutation.error ? analyzeMutation.error.message : null);

  function handleSubmit(value: string) {
    const trimmed = value.trim();
    setClientError(null);
    setAnalysis(null);
    setSelectedQuality(null);

    if (!trimmed) {
      setClientError("Paste a YouTube URL to analyze.");
      return;
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(trimmed);
    } catch {
      setClientError("Use a complete URL, for example https://youtube.com/watch?v=...");
      return;
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      setClientError("Only web links are supported.");
      return;
    }

    analyzeMutation.mutate(trimmed);
  }

  function resetAnalysis() {
    setAnalysis(null);
    setSelectedQuality(null);
    setClientError(null);
    analyzeMutation.reset();
  }

  if (analysis?.type === "video") {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-7xl flex-col px-6 py-8 sm:px-8 lg:min-h-screen lg:px-12 lg:py-12">
        <MediaPreviewCard
          onBack={resetAnalysis}
          onSelectQuality={setSelectedQuality}
          preview={analysis}
          selectedQuality={selectedQuality}
        />
      </div>
    );
  }

  if (analysis?.type === "playlist") {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-7xl flex-col px-6 py-8 sm:px-8 lg:min-h-screen lg:px-12 lg:py-12">
        <PlaylistPreviewCard onBack={resetAnalysis} preview={analysis} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-7xl flex-col px-6 py-12 sm:px-8 lg:min-h-screen lg:px-12 lg:py-16">
      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-8 text-center">
        <div className="flex flex-col items-center gap-5">
          <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--foreground-muted)] shadow-[var(--shadow-soft)]">
            Local-first YouTube archive
          </span>
          <h1 className="max-w-4xl text-4xl font-extrabold leading-tight tracking-tight text-[var(--foreground)] sm:text-5xl lg:text-6xl">
            Extract allowed media into your personal vault.
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-[var(--foreground-muted)] sm:text-xl">
            Paste a link, choose your quality, and save videos, audio, and playlists in one clean space.
          </p>
        </div>

        <UrlInputCard
          error={visibleError}
          isLoading={analyzeMutation.isPending}
          onSubmit={handleSubmit}
          onUrlChange={(value) => {
            setUrl(value);
            setClientError(null);
            if (analyzeMutation.error) {
              analyzeMutation.reset();
            }
          }}
          url={url}
        />

        {analyzeMutation.isPending ? (
          <p className="text-sm font-semibold text-[var(--foreground-muted)]" role="status">
            Fetching metadata and available qualities...
          </p>
        ) : null}

        <section className="flex flex-col items-center gap-5" aria-label="Supported capabilities">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--foreground-soft)]">
            Supported in this MVP
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-[var(--foreground-soft)]">
            <CapabilityChip icon={CirclePlay} label="YouTube" />
            <CapabilityChip icon={FileVideo} label="Video" />
            <CapabilityChip icon={Archive} label="Audio" />
            <CapabilityChip icon={ClipboardList} label="Playlists" />
          </div>
        </section>
      </section>

      <section className="mx-auto mt-16 w-full max-w-4xl lg:mt-6" aria-label="Recent activity">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Recent Activity
          </h2>
          <button
            aria-disabled="true"
            className="text-sm font-bold text-[var(--primary)] opacity-70"
            type="button"
          >
            View All
          </button>
        </div>
        <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-6 py-8 text-center shadow-[var(--shadow-soft)]">
          <Archive size={36} className="text-[var(--foreground-soft)]" aria-hidden="true" />
          <p className="mt-4 max-w-md text-base leading-7 text-[var(--foreground-muted)]">
            Your vault is empty. Paste a YouTube link to start preparing your first archive item.
          </p>
        </div>
      </section>

      <footer className="mx-auto mt-10 max-w-2xl border-t border-[var(--border-soft)] px-2 pt-8 text-center text-sm font-semibold leading-6 text-[var(--foreground-muted)]">
        Nextract is intended for archiving personal or permitted content. Respect copyright laws and platform terms of service.
      </footer>
    </div>
  );
}

function CapabilityChip({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <span className="flex min-h-11 items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-4 text-sm font-bold text-[var(--foreground-muted)] shadow-[var(--shadow-soft)]">
      <Icon size={19} aria-hidden={true} />
      {label}
    </span>
  );
}
