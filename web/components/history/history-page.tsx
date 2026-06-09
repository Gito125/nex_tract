"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  CheckCircle2,
  ExternalLink,
  FolderOpen,
  LoaderCircle,
  RotateCcw,
  Search,
  XCircle,
} from "lucide-react";

import {
  listHistory,
  openHistoryFile,
  openHistoryFolder,
  redownloadHistoryItem,
} from "@/lib/api";
import type { HistoryFilters, HistoryItem, HistoryStatus } from "@/lib/types";

type StatusFilter = "all" | HistoryStatus;

export function HistoryPage() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const filters = useMemo<HistoryFilters>(
    () => ({
      query: query.trim() || undefined,
      status: status === "all" ? undefined : status,
      from: from ? `${from}T00:00:00Z` : undefined,
      to: to ? `${to}T23:59:59Z` : undefined,
      limit: 50,
      offset: 0,
    }),
    [from, query, status, to],
  );

  const historyQuery = useQuery({
    queryKey: ["history", filters],
    queryFn: () => listHistory(filters),
  });

  const redownloadMutation = useMutation({
    mutationFn: redownloadHistoryItem,
    onSuccess: () => {
      setActionMessage("Download added back to the queue.");
      queryClient.invalidateQueries({ queryKey: ["downloads"] });
    },
  });

  const openFileMutation = useMutation({
    mutationFn: openHistoryFile,
    onSuccess: (response) => setActionMessage(response.message),
  });

  const openFolderMutation = useMutation({
    mutationFn: openHistoryFolder,
    onSuccess: (response) => setActionMessage(response.message),
  });

  const actionError =
    redownloadMutation.error?.message ??
    openFileMutation.error?.message ??
    openFolderMutation.error?.message ??
    null;

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8 sm:px-8 lg:px-12 lg:py-10">
      <header className="mb-7 flex flex-col gap-3">
        <span
          className="inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest"
          style={{
            background: "var(--primary-soft)",
            border: "1px solid var(--border-primary)",
            color: "var(--primary-strong)",
          }}
        >
          <Archive size={13} aria-hidden="true" />
          Vault
        </span>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Download History
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6" style={{ color: "var(--foreground-muted)" }}>
              Completed and failed downloads are saved here with their original quality, path, and status.
            </p>
          </div>
          <p className="text-sm font-semibold tabular-nums" style={{ color: "var(--foreground-soft)" }}>
            {historyQuery.data?.total ?? 0} saved items
          </p>
        </div>
      </header>

      <section
        className="mb-5 grid gap-3 rounded-2xl p-4 lg:grid-cols-[1fr_180px_150px_150px]"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-soft)",
        }}
        aria-label="History filters"
      >
        <label className="relative block">
          <span className="sr-only">Search history</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
            size={16}
            style={{ color: "var(--foreground-soft)" }}
          />
          <input
            className="h-11 w-full rounded-lg border bg-transparent pl-10 pr-3 text-sm"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search title or URL"
            style={{ borderColor: "var(--border-strong)", color: "var(--foreground)" }}
            value={query}
          />
        </label>

        <select
          aria-label="Status filter"
          className="h-11 rounded-lg border bg-transparent px-3 text-sm font-semibold"
          onChange={(event) => setStatus(event.target.value as StatusFilter)}
          style={{ borderColor: "var(--border-strong)", color: "var(--foreground)" }}
          value={status}
        >
          <option value="all">All statuses</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>

        <input
          aria-label="From date"
          className="h-11 rounded-lg border bg-transparent px-3 text-sm"
          onChange={(event) => setFrom(event.target.value)}
          style={{ borderColor: "var(--border-strong)", color: "var(--foreground)" }}
          type="date"
          value={from}
        />

        <input
          aria-label="To date"
          className="h-11 rounded-lg border bg-transparent px-3 text-sm"
          onChange={(event) => setTo(event.target.value)}
          style={{ borderColor: "var(--border-strong)", color: "var(--foreground)" }}
          type="date"
          value={to}
        />
      </section>

      {actionMessage ? <Notice tone="success" message={actionMessage} /> : null}
      {actionError ? <Notice tone="error" message={actionError} /> : null}

      <section aria-label="History results">
        {historyQuery.isLoading ? (
          <StateBlock icon={LoaderCircle} label="Loading history" spinning />
        ) : historyQuery.error ? (
          <StateBlock icon={XCircle} label={historyQuery.error.message} />
        ) : historyQuery.data?.items.length === 0 ? (
          <StateBlock icon={Archive} label="No history matches these filters." />
        ) : (
          <div className="space-y-3">
            {historyQuery.data?.items.map((item) => (
              <HistoryCard
                item={item}
                key={item.id}
                onOpenFile={(id) => openFileMutation.mutate(id)}
                onOpenFolder={(id) => openFolderMutation.mutate(id)}
                onRedownload={(id) => redownloadMutation.mutate(id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function HistoryCard({
  item,
  onOpenFile,
  onOpenFolder,
  onRedownload,
}: {
  item: HistoryItem;
  onOpenFile: (id: string) => void;
  onOpenFolder: (id: string) => void;
  onRedownload: (id: string) => void;
}) {
  return (
    <article
      className="grid gap-4 rounded-2xl p-4 md:grid-cols-[112px_1fr_auto]"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      <div
        className="aspect-video overflow-hidden rounded-xl md:aspect-square"
        style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
      >
        {item.thumbnail ? (
          <img alt="" className="h-full w-full object-cover" src={item.thumbnail} />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Archive size={30} style={{ color: "var(--foreground-soft)" }} aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <StatusBadge status={item.status} />
          <MetadataPill value={formatQuality(item.selectedQuality)} />
          <MetadataPill value="YouTube" />
          {item.fileSize ? <MetadataPill value={formatBytes(item.fileSize)} /> : null}
        </div>
        <h2 className="line-clamp-2 text-base font-bold leading-snug sm:text-lg">
          {item.title}
        </h2>
        <p className="mt-2 truncate text-xs" style={{ color: "var(--foreground-soft)" }} title={item.url}>
          {item.url}
        </p>
        {item.outputPath ? (
          <p
            className="mt-2 truncate text-xs"
            style={{ color: "var(--foreground-muted)" }}
            title={item.outputPath}
          >
            {item.outputPath}
          </p>
        ) : null}
        {item.errorMessage ? (
          <p className="mt-2 text-sm font-medium" style={{ color: "var(--error)" }}>
            {item.errorMessage}
          </p>
        ) : null}
        <p className="mt-3 text-xs font-semibold" style={{ color: "var(--foreground-soft)" }}>
          {formatDate(item.completedAt)}
        </p>
      </div>

      <div className="flex flex-wrap items-start gap-2 md:justify-end">
        <ActionButton
          disabled={!item.outputPath}
          icon={ExternalLink}
          label="Open file"
          onClick={() => onOpenFile(item.id)}
        />
        <ActionButton
          disabled={!item.outputPath}
          icon={FolderOpen}
          label="Open folder"
          onClick={() => onOpenFolder(item.id)}
        />
        <ActionButton
          icon={RotateCcw}
          label="Re-download"
          onClick={() => onRedownload(item.id)}
          primary
        />
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: HistoryStatus }) {
  const isCompleted = status === "completed";
  const Icon = isCompleted ? CheckCircle2 : XCircle;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold capitalize"
      style={{
        background: isCompleted ? "var(--success-soft)" : "var(--error-soft)",
        border: `1px solid ${isCompleted ? "var(--success)" : "var(--error)"}`,
        color: isCompleted ? "var(--success)" : "var(--error)",
      }}
    >
      <Icon size={13} aria-hidden="true" />
      {status}
    </span>
  );
}

function MetadataPill({ value }: { value: string }) {
  return (
    <span
      className="rounded-md px-2 py-1 text-xs font-bold uppercase tracking-wider"
      style={{
        background: "var(--surface-raised)",
        border: "1px solid var(--border)",
        color: "var(--foreground-soft)",
      }}
    >
      {value}
    </span>
  );
}

function ActionButton({
  disabled,
  icon: Icon,
  label,
  onClick,
  primary,
}: {
  disabled?: boolean;
  icon: typeof ExternalLink;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={disabled}
      onClick={onClick}
      style={{
        background: primary ? "var(--primary)" : "var(--surface-raised)",
        border: primary ? "1px solid var(--primary)" : "1px solid var(--border-strong)",
        color: primary ? "#fff" : "var(--foreground-muted)",
      }}
      type="button"
    >
      <Icon size={14} aria-hidden="true" />
      {label}
    </button>
  );
}

function Notice({ message, tone }: { message: string; tone: "success" | "error" }) {
  return (
    <p
      className="mb-3 rounded-lg px-3 py-2 text-sm font-semibold"
      role={tone === "error" ? "alert" : "status"}
      style={{
        background: tone === "success" ? "var(--success-soft)" : "var(--error-soft)",
        border: `1px solid ${tone === "success" ? "var(--success)" : "var(--error)"}`,
        color: tone === "success" ? "var(--success)" : "var(--error)",
      }}
    >
      {message}
    </p>
  );
}

function StateBlock({
  icon: Icon,
  label,
  spinning,
}: {
  icon: typeof Archive;
  label: string;
  spinning?: boolean;
}) {
  return (
    <div
      className="flex min-h-64 flex-col items-center justify-center rounded-2xl px-6 text-center"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-soft)",
        color: "var(--foreground-muted)",
      }}
    >
      <Icon className={spinning ? "animate-spin" : undefined} size={28} aria-hidden="true" />
      <p className="mt-3 text-sm font-semibold">{label}</p>
    </div>
  );
}

function formatQuality(value: string) {
  return value.replaceAll("_", " ");
}

function formatBytes(bytes: number) {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
