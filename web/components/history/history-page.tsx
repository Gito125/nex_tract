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
      to:   to   ? `${to}T23:59:59Z`   : undefined,
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

  const openFileMutation   = useMutation({ mutationFn: openHistoryFile,   onSuccess: (r) => setActionMessage(r.message) });
  const openFolderMutation = useMutation({ mutationFn: openHistoryFolder, onSuccess: (r) => setActionMessage(r.message) });

  const actionError =
    redownloadMutation.error?.message ??
    openFileMutation.error?.message ??
    openFolderMutation.error?.message ??
    null;

  return (
    <div
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "32px 24px 64px",
      }}
    >
      {/* Header */}
      <header style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "4px 12px",
              borderRadius: "9999px",
              background: "var(--primary-soft)",
              border: "1px solid var(--border-primary)",
              color: "var(--primary-strong)",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            <Archive size={11} aria-hidden="true" />
            Vault
          </span>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "12px" }}>
          <div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(26px, 4vw, 36px)",
                fontWeight: 800,
                letterSpacing: "-0.04em",
                color: "var(--foreground)",
                lineHeight: 1.1,
                marginBottom: "6px",
              }}
            >
              Download History
            </h1>
            <p style={{ fontSize: "14px", color: "var(--foreground-muted)", maxWidth: "480px", lineHeight: 1.5 }}>
              Completed and failed downloads, with their quality, path, and status.
            </p>
          </div>
          <p
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "var(--foreground-soft)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {historyQuery.data?.total ?? 0} items
          </p>
        </div>
      </header>

      {/* Filters */}
      <div
        className="history-filter-grid"
        style={{
          gap: "10px",
          padding: "14px",
          borderRadius: "14px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-soft)",
          marginBottom: "20px",
        }}
        aria-label="History filters"
      >
        {/* Search */}
        <label style={{ position: "relative", display: "block" }}>
          <span className="sr-only">Search history</span>
          <Search
            aria-hidden="true"
            size={15}
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--foreground-soft)",
              pointerEvents: "none",
            }}
          />
          <input
            className="ui-field"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title or URL…"
            style={{
              width: "100%",
              height: "44px",
              paddingLeft: "36px",
              paddingRight: "12px",
              borderRadius: "8px",
              fontSize: "13px",
            }}
          />
        </label>

        {/* Status */}
        <select
          className="ui-field"
          aria-label="Status filter"
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
          style={{
            height: "44px",
            padding: "0 12px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            minWidth: "130px",
          }}
        >
          <option value="all">All statuses</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>

        {/* From date */}
        <input
          className="ui-field"
          aria-label="From date"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          style={{
            height: "44px",
            padding: "0 12px",
            borderRadius: "8px",
            fontSize: "13px",
            minWidth: "0",
          }}
        />

        {/* To date */}
        <input
          className="ui-field"
          aria-label="To date"
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          style={{
            height: "44px",
            padding: "0 12px",
            borderRadius: "8px",
            fontSize: "13px",
            minWidth: "0",
          }}
        />
      </div>

      {/* Notices */}
      {actionMessage && <Notice tone="success" message={actionMessage} onDismiss={() => setActionMessage(null)} />}
      {actionError   && <Notice tone="error"   message={actionError} />}

      {/* Results */}
      <section aria-label="History results">
        {historyQuery.isLoading ? (
          <EmptyState icon={LoaderCircle} label="Loading your vault…" spinning />
        ) : historyQuery.error ? (
          <EmptyState icon={XCircle} label={historyQuery.error.message} />
        ) : historyQuery.data?.items.length === 0 ? (
          <EmptyState icon={Archive} label="Nothing matches these filters." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
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

/* ── History card ──────────────────────────────────────────────── */
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
  const isCompleted = item.status === "completed";

  return (
    <article
      className="history-card"
      style={{
        gap: "16px",
        padding: "16px",
        borderRadius: "16px",
        background: "var(--surface)",
        border: isCompleted
          ? "1px solid var(--border)"
          : "1px solid var(--error-border)",
        boxShadow: "var(--shadow-soft)",
        transition: "border 0.2s",
        alignItems: "start",
      }}
    >
      {/* Thumbnail */}
      <div
        style={{
          aspectRatio: "16/9",
          borderRadius: "8px",
          overflow: "hidden",
          background: "var(--surface-raised)",
          border: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        {item.thumbnail ? (
          <img
            alt=""
            src={item.thumbnail}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "100%",
            }}
          >
            <Archive size={24} style={{ color: "var(--foreground-soft)" }} aria-hidden="true" />
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ minWidth: 0 }}>
        {/* Badges */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
          <StatusBadge status={item.status} />
          <Pill value={formatQuality(item.selectedQuality)} />
          <Pill value="YouTube" />
          {item.fileSize ? <Pill value={formatBytes(item.fileSize)} /> : null}
        </div>

        {/* Title */}
        <h2
          style={{
            fontSize: "14px",
            fontWeight: 700,
            lineHeight: 1.4,
            color: "var(--foreground)",
            marginBottom: "4px",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {item.title}
        </h2>

        {/* URL */}
        <p
          style={{
            fontSize: "11px",
            color: "var(--foreground-subtle)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            marginBottom: "2px",
          }}
          title={item.url}
        >
          {item.url}
        </p>

        {/* Path */}
        {item.outputPath && (
          <p
            style={{
              fontSize: "11px",
              color: "var(--foreground-muted)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={item.outputPath}
          >
            {item.outputPath}
          </p>
        )}

        {/* Error */}
        {item.errorMessage && (
          <p style={{ fontSize: "12px", color: "var(--error)", fontWeight: 500, marginTop: "4px" }}>
            {item.errorMessage}
          </p>
        )}

        {/* Date */}
        <p
          style={{
            fontSize: "11px",
            fontWeight: 600,
            color: "var(--foreground-soft)",
            marginTop: "8px",
          }}
        >
          {formatDate(item.completedAt)}
        </p>
      </div>

      {/* Actions */}
      <div className="history-card-actions">
        <ActionBtn disabled={!item.outputPath} icon={ExternalLink} label="Open file"   onClick={() => onOpenFile(item.id)} />
        <ActionBtn disabled={!item.outputPath} icon={FolderOpen}   label="Open folder" onClick={() => onOpenFolder(item.id)} />
        <ActionBtn icon={RotateCcw} label="Re-download" onClick={() => onRedownload(item.id)} primary />
      </div>
    </article>
  );
}

/* ── Status badge ──────────────────────────────────────────────── */
function StatusBadge({ status }: { status: HistoryStatus }) {
  const ok = status === "completed";
  const Icon = ok ? CheckCircle2 : XCircle;
  return (
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
        background:  ok ? "var(--success-soft)" : "var(--error-soft)",
        border: `1px solid ${ok ? "var(--success-border)" : "var(--error-border)"}`,
        color: ok ? "var(--success)" : "var(--error)",
      }}
    >
      <Icon size={11} aria-hidden="true" />
      {status}
    </span>
  );
}

/* ── Small pill ────────────────────────────────────────────────── */
function Pill({ value }: { value: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 9px",
        borderRadius: "9999px",
        fontSize: "11px",
        fontWeight: 600,
        letterSpacing: "0.03em",
        background: "var(--surface-raised)",
        border: "1px solid var(--border-strong)",
        color: "var(--foreground-soft)",
        textTransform: "uppercase",
      }}
    >
      {value}
    </span>
  );
}

/* ── Action button ─────────────────────────────────────────────── */
function ActionBtn({
  disabled,
  icon: Icon,
  label,
  onClick,
  primary,
}: {
  disabled?: boolean;
  icon: React.ElementType;
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
        justifyContent: "center",
        gap: "5px",
        minHeight: "44px",
        padding: "0 12px",
        borderRadius: "8px",
        border: primary ? "none" : "1px solid var(--border-strong)",
        background: primary ? "var(--primary)" : "var(--surface-raised)",
        color: primary ? "var(--on-primary)" : "var(--foreground-muted)",
        fontSize: "12px",
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        fontFamily: "var(--font-body)",
        boxShadow: primary ? "0 2px 8px var(--primary-glow)" : "none",
        transition: "all 0.15s",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => {
        if (!disabled && !primary) {
          (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-hover)";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--foreground)";
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !primary) {
          (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-raised)";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--foreground-muted)";
        }
      }}
    >
      <Icon size={13} aria-hidden="true" />
      {label}
    </button>
  );
}

/* ── Notice ────────────────────────────────────────────────────── */
function Notice({
  message,
  tone,
  onDismiss,
}: {
  message: string;
  tone: "success" | "error";
  onDismiss?: () => void;
}) {
  return (
    <div
      className={`ui-notice ${tone === "success" ? "ui-notice--success" : "ui-notice--error"}`}
      role={tone === "error" ? "alert" : "status"}
      style={{
        marginBottom: "14px",
      }}
    >
      <span>{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontSize: "16px", lineHeight: 1 }}
          aria-label="Dismiss"
        >
          ×
        </button>
      )}
    </div>
  );
}

/* ── Empty state ───────────────────────────────────────────────── */
function EmptyState({
  icon: Icon,
  label,
  spinning,
}: {
  icon: React.ElementType;
  label: string;
  spinning?: boolean;
}) {
  return (
    <div
      className="ui-empty"
      style={{
        minHeight: "260px",
        padding: "40px",
      }}
    >
      <Icon
        size={28}
        aria-hidden="true"
        style={{ animation: spinning ? "spin 0.8s linear infinite" : "none" }}
      />
      <p style={{ fontSize: "13px", fontWeight: 600 }}>{label}</p>
    </div>
  );
}

/* ── Helpers ────────────────────────────────────────────────────── */
function formatQuality(v: string) { return v.replaceAll("_", " "); }

function formatBytes(bytes: number) {
  const units = ["B", "KB", "MB", "GB"];
  let s = bytes, i = 0;
  while (s >= 1024 && i < units.length - 1) { s /= 1024; i++; }
  return `${s.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
