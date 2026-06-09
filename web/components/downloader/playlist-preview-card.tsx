"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Ban,
  Check,
  ClipboardList,
  Download,
  FileAudio,
  ListVideo,
  LoaderCircle,
} from "lucide-react";
import type {
  AnalyzeResponse,
  PlaylistAnalyzeItem,
  PlaylistCreateRequest,
  PlaylistItem,
  PlaylistResponse,
  QualityValue,
} from "@/lib/types";

type PlaylistStartOptions = Pick<
  PlaylistCreateRequest,
  "selectedIndexes" | "rangeStart" | "rangeEnd" | "skipExisting"
>;

type SelectionMode = "selected" | "range";

export function PlaylistPreviewCard({
  defaultSkipExisting,
  isCancelPending,
  isStartPending,
  onBack,
  onCancel,
  onSelectQuality,
  onStart,
  playlist,
  preview,
  selectedQuality,
  startError,
}: {
  defaultSkipExisting: boolean;
  isCancelPending: boolean;
  isStartPending: boolean;
  onBack: () => void;
  onCancel: () => void;
  onSelectQuality: (quality: QualityValue) => void;
  onStart: (options: PlaylistStartOptions) => void;
  playlist: PlaylistResponse | null;
  preview: AnalyzeResponse;
  selectedQuality: QualityValue | null;
  startError: string | null;
}) {
  const items = useMemo(() => preview.playlist?.items ?? [], [preview.playlist]);
  const availableIndexes = useMemo(
    () => items.filter((item) => item.available).map((item) => item.index),
    [items],
  );
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("selected");
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>(availableIndexes);
  const [rangeStart, setRangeStart] = useState("1");
  const [rangeEnd, setRangeEnd] = useState(String(items.length || 1));
  const [skipExisting, setSkipExisting] = useState(defaultSkipExisting);

  const itemStatusByIndex = useMemo(() => {
    const map = new Map<number, PlaylistItem>();
    for (const item of playlist?.items ?? []) map.set(item.itemIndex, item);
    return map;
  }, [playlist]);

  const selectedCount =
    selectionMode === "range"
      ? rangeSelectionCount(Number(rangeStart), Number(rangeEnd), items.length)
      : selectedIndexes.length;
  const isRunning = playlist?.status === "pending" || playlist?.status === "downloading";
  const canStart = Boolean(selectedQuality) && selectedCount > 0 && !isStartPending && !isRunning;

  function toggleIndex(index: number) {
    setSelectedIndexes((current) =>
      current.includes(index)
        ? current.filter((item) => item !== index)
        : [...current, index].sort((a, b) => a - b),
    );
  }

  function startPlaylist() {
    if (!canStart) return;
    if (selectionMode === "range") {
      onStart({
        rangeStart: Number(rangeStart),
        rangeEnd: Number(rangeEnd),
        skipExisting,
      });
      return;
    }
    onStart({ selectedIndexes, skipExisting });
  }

  return (
    <section className="animate-fade-up" aria-label="Playlist preview">
      <button
        type="button"
        onClick={onBack}
        style={backButtonStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--surface-raised)";
          e.currentTarget.style.borderColor = "var(--border-strong)";
          e.currentTarget.style.color = "var(--foreground)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "none";
          e.currentTarget.style.borderColor = "transparent";
          e.currentTarget.style.color = "var(--foreground-muted)";
        }}
      >
        <ArrowLeft size={15} aria-hidden="true" />
        Back to paste
      </button>

      <div style={shellStyle}>
        <div style={accentStyle} aria-hidden="true" />

        <div style={{ padding: "28px" }}>
          <PlaylistHeader itemCount={items.length} preview={preview} />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: "18px", marginTop: "24px" }}>
            <div style={panelStyle}>
              <SectionTitle title="Items" detail={`${selectedCount} selected`} />
              <SelectionControls
                availableCount={availableIndexes.length}
                itemCount={items.length}
                mode={selectionMode}
                rangeEnd={rangeEnd}
                rangeStart={rangeStart}
                selectedCount={selectedIndexes.length}
                setMode={setSelectionMode}
                setRangeEnd={setRangeEnd}
                setRangeStart={setRangeStart}
                setSelectedIndexes={setSelectedIndexes}
                availableIndexes={availableIndexes}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "14px", maxHeight: "440px", overflowY: "auto", paddingRight: "4px" }}>
                {items.map((item) => (
                  <PlaylistItemRow
                    checked={selectedIndexes.includes(item.index)}
                    disabled={selectionMode === "range" || !item.available || isRunning}
                    item={item}
                    key={item.index}
                    onToggle={() => toggleIndex(item.index)}
                    statusItem={itemStatusByIndex.get(item.index) ?? null}
                  />
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={panelStyle}>
                <SectionTitle title="Format" detail="Shared for selected items" />
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "12px" }}>
                  {preview.qualities.map((option) => {
                    const isSelected = option.value === selectedQuality;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => onSelectQuality(option.value)}
                        disabled={isRunning}
                        style={{
                          ...qualityButtonStyle,
                          borderColor: isSelected ? "var(--primary)" : "var(--border-strong)",
                          background: isSelected ? "var(--primary)" : "var(--surface-raised)",
                          color: isSelected ? "var(--on-primary)" : "var(--foreground-muted)",
                          cursor: isRunning ? "not-allowed" : "pointer",
                          opacity: isRunning ? 0.68 : 1,
                        }}
                      >
                        {option.kind === "audio" && <FileAudio size={12} aria-hidden="true" />}
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                <label style={checkLabelStyle}>
                  <input
                    checked={skipExisting}
                    disabled={isRunning}
                    onChange={(event) => setSkipExisting(event.target.checked)}
                    type="checkbox"
                  />
                  Skip existing items found in history
                </label>
              </div>

              <PlaylistProgress playlist={playlist} />

              <div style={panelStyle}>
                <button
                  type="button"
                  disabled={!canStart}
                  onClick={startPlaylist}
                  style={{
                    ...primaryButtonStyle,
                    cursor: canStart ? "pointer" : "not-allowed",
                    opacity: canStart ? 1 : 0.62,
                  }}
                >
                  {isStartPending ? (
                    <LoaderCircle size={16} aria-hidden="true" style={{ animation: "spin 0.8s linear infinite" }} />
                  ) : (
                    <Download size={16} aria-hidden="true" />
                  )}
                  {isStartPending ? "Starting…" : `Download ${selectedCount} item${selectedCount === 1 ? "" : "s"}`}
                </button>
                {isRunning && (
                  <button
                    type="button"
                    disabled={isCancelPending}
                    onClick={onCancel}
                    style={secondaryButtonStyle}
                  >
                    {isCancelPending ? "Cancelling…" : "Cancel playlist"}
                  </button>
                )}
                {startError && <p role="alert" style={errorStyle}>{startError}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PlaylistHeader({
  itemCount,
  preview,
}: {
  itemCount: number;
  preview: AnalyzeResponse;
}) {
  return (
    <div style={{ display: "flex", gap: "18px", alignItems: "flex-start", flexWrap: "wrap" }}>
      <div style={iconBoxStyle}>
        <ListVideo size={26} style={{ color: "var(--primary-strong)" }} aria-hidden="true" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={eyebrowStyle}>YouTube Playlist</p>
        <h2 style={titleStyle}>{preview.title}</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
          <span style={badgeStyle}>
            <ClipboardList size={13} aria-hidden="true" />
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </span>
          {preview.creator && <span style={mutedTextStyle}>{preview.creator}</span>}
        </div>
      </div>
    </div>
  );
}

function SelectionControls({
  availableCount,
  availableIndexes,
  itemCount,
  mode,
  rangeEnd,
  rangeStart,
  selectedCount,
  setMode,
  setRangeEnd,
  setRangeStart,
  setSelectedIndexes,
}: {
  availableCount: number;
  availableIndexes: number[];
  itemCount: number;
  mode: SelectionMode;
  rangeEnd: string;
  rangeStart: string;
  selectedCount: number;
  setMode: (mode: SelectionMode) => void;
  setRangeEnd: (value: string) => void;
  setRangeStart: (value: string) => void;
  setSelectedIndexes: (indexes: number[]) => void;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
      <button
        type="button"
        onClick={() => setMode("selected")}
        style={modeButtonStyle(mode === "selected")}
      >
        Selected
      </button>
      <button
        type="button"
        onClick={() => setMode("range")}
        style={modeButtonStyle(mode === "range")}
      >
        Range
      </button>
      {mode === "selected" ? (
        <>
          <button type="button" onClick={() => setSelectedIndexes(availableIndexes)} style={smallButtonStyle}>
            Select all
          </button>
          <button type="button" onClick={() => setSelectedIndexes([])} style={smallButtonStyle}>
            Clear
          </button>
          <span style={mutedTextStyle}>{selectedCount}/{availableCount} available selected</span>
        </>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <NumberInput label="Start" max={itemCount} min={1} value={rangeStart} onChange={setRangeStart} />
          <NumberInput label="End" max={itemCount} min={1} value={rangeEnd} onChange={setRangeEnd} />
        </div>
      )}
    </div>
  );
}

function NumberInput({
  label,
  max,
  min,
  onChange,
  value,
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--foreground-muted)", fontWeight: 600 }}>
      {label}
      <input
        max={max}
        min={min}
        onChange={(event) => onChange(event.target.value)}
        style={numberInputStyle}
        type="number"
        value={value}
      />
    </label>
  );
}

function PlaylistItemRow({
  checked,
  disabled,
  item,
  onToggle,
  statusItem,
}: {
  checked: boolean;
  disabled: boolean;
  item: PlaylistAnalyzeItem;
  onToggle: () => void;
  statusItem: PlaylistItem | null;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      style={{
        display: "grid",
        gridTemplateColumns: "auto minmax(0, 1fr) auto",
        gap: "10px",
        alignItems: "center",
        padding: "10px",
        borderRadius: "10px",
        border: "1px solid var(--border)",
        background: checked ? "var(--primary-soft)" : "var(--surface-raised)",
        textAlign: "left",
        cursor: disabled ? "default" : "pointer",
        opacity: item.available ? 1 : 0.62,
        fontFamily: "var(--font-body)",
      }}
    >
      <span style={checkboxStyle(checked)}>
        {checked && <Check size={12} aria-hidden="true" />}
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {String(item.index).padStart(3, "0")} · {item.title}
        </span>
        <span style={{ display: "block", fontSize: "12px", color: "var(--foreground-soft)", marginTop: "2px" }}>
          {item.available ? formatDuration(item.duration) : item.errorMessage ?? "Unavailable"}
        </span>
      </span>
      <StatusBadge item={statusItem} source={item} />
    </button>
  );
}

function StatusBadge({
  item,
  source,
}: {
  item: PlaylistItem | null;
  source: PlaylistAnalyzeItem;
}) {
  if (!source.available) {
    return <span style={statusStyle("failed")}><Ban size={11} aria-hidden="true" />Unavailable</span>;
  }
  if (!item) return <span style={statusStyle("queued")}>Ready</span>;
  if (item.status === "downloading") {
    return <span style={statusStyle("downloading")}>{item.progress}%</span>;
  }
  return <span style={statusStyle(item.status)}>{item.status}</span>;
}

function PlaylistProgress({ playlist }: { playlist: PlaylistResponse | null }) {
  if (!playlist) {
    return (
      <div style={panelStyle}>
        <SectionTitle title="Progress" detail="Not started" />
        <p style={{ ...mutedTextStyle, marginTop: "10px", lineHeight: 1.5 }}>
          Playlist progress will show completed, failed, skipped, and current item counts.
        </p>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      <SectionTitle title="Progress" detail={playlist.status} />
      <div style={progressTrackStyle}>
        <div style={{ ...progressFillStyle, width: `${playlist.progress}%` }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginTop: "12px" }}>
        <Metric label="Done" value={playlist.completedItems} />
        <Metric label="Failed" value={playlist.failedItems} />
        <Metric label="Skipped" value={playlist.skippedItems} />
        <Metric label="Total" value={playlist.totalItems} />
      </div>
      {playlist.currentItemTitle && (
        <p style={{ fontSize: "12px", color: "var(--foreground-muted)", marginTop: "12px", lineHeight: 1.45 }}>
          Current: <strong>{playlist.currentItemIndex}. {playlist.currentItemTitle}</strong>
          {typeof playlist.currentItemProgress === "number" ? ` · ${playlist.currentItemProgress}%` : ""}
        </p>
      )}
      {playlist.errorMessage && <p style={errorStyle}>{playlist.errorMessage}</p>}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ padding: "9px", borderRadius: "8px", background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
      <div style={{ fontSize: "16px", fontWeight: 800, color: "var(--foreground)", fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--foreground-subtle)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
    </div>
  );
}

function SectionTitle({ detail, title }: { detail: string; title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "10px" }}>
      <h3 style={{ fontSize: "14px", fontWeight: 800, color: "var(--foreground)", letterSpacing: "-0.02em" }}>{title}</h3>
      <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--foreground-soft)", textTransform: "capitalize" }}>{detail}</span>
    </div>
  );
}

function rangeSelectionCount(start: number, end: number, total: number): number {
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  if (start < 1 || end < start || end > total) return 0;
  return end - start + 1;
}

function formatDuration(duration: number | null): string {
  if (!duration) return "Duration unavailable";
  const h = Math.floor(duration / 3600);
  const m = Math.floor((duration % 3600) / 60);
  const s = duration % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const backButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "7px",
  padding: "7px 12px 7px 8px",
  borderRadius: "8px",
  background: "none",
  border: "1px solid transparent",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: 600,
  color: "var(--foreground-muted)",
  marginBottom: "20px",
  transition: "all 0.15s",
  fontFamily: "var(--font-body)",
};
const shellStyle = { borderRadius: "20px", overflow: "hidden", background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lift)" };
const accentStyle = { height: "3px", background: "linear-gradient(90deg, var(--primary), var(--accent))" };
const panelStyle = { borderRadius: "14px", background: "var(--surface)", border: "1px solid var(--border)", padding: "16px", boxShadow: "var(--shadow-soft)" };
const iconBoxStyle = { display: "flex", alignItems: "center", justifyContent: "center", width: "58px", height: "58px", borderRadius: "14px", background: "var(--primary-soft)", border: "1px solid var(--border-primary)", flexShrink: 0 };
const eyebrowStyle = { fontSize: "10px", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase" as const, color: "var(--foreground-subtle)", marginBottom: "7px" };
const titleStyle = { fontFamily: "var(--font-display)", fontSize: "clamp(20px, 3vw, 28px)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.2, color: "var(--foreground)", marginBottom: "10px", wordBreak: "break-word" as const };
const badgeStyle = { display: "inline-flex", alignItems: "center", gap: "5px", padding: "5px 12px", borderRadius: "9999px", background: "var(--accent-soft)", border: "1px solid var(--accent-muted)", color: "var(--accent-strong)", fontSize: "13px", fontWeight: 700 };
const mutedTextStyle = { fontSize: "12px", color: "var(--foreground-muted)" };
const smallButtonStyle = { padding: "7px 10px", borderRadius: "8px", border: "1px solid var(--border-strong)", background: "var(--surface-raised)", color: "var(--foreground-muted)", fontSize: "12px", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" };
const qualityButtonStyle = { display: "inline-flex", alignItems: "center", gap: "5px", padding: "7px 12px", borderRadius: "9999px", border: "1.5px solid var(--border-strong)", fontSize: "12px", fontWeight: 700, fontFamily: "var(--font-body)" };
const checkLabelStyle = { display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--foreground-muted)", fontWeight: 600, marginTop: "14px" };
const primaryButtonStyle = { width: "100%", minHeight: "46px", borderRadius: "10px", border: "none", background: "var(--primary)", color: "var(--on-primary)", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontSize: "14px", fontWeight: 800, fontFamily: "var(--font-body)", boxShadow: "0 4px 14px var(--primary-glow)" };
const secondaryButtonStyle = { ...smallButtonStyle, width: "100%", minHeight: "42px", marginTop: "10px" };
const errorStyle = { fontSize: "12px", fontWeight: 600, color: "var(--error)", marginTop: "10px", lineHeight: 1.45 };
const numberInputStyle = { width: "70px", height: "34px", borderRadius: "8px", border: "1px solid var(--border-strong)", background: "var(--surface-raised)", color: "var(--foreground)", padding: "0 8px", fontSize: "13px", fontWeight: 700 };
const progressTrackStyle = { height: "8px", borderRadius: "9999px", background: "var(--surface-raised)", border: "1px solid var(--border)", overflow: "hidden", marginTop: "12px" };
const progressFillStyle = { height: "100%", borderRadius: "9999px", background: "linear-gradient(90deg, var(--primary), var(--accent))", transition: "width 0.2s var(--ease-out)" };

function checkboxStyle(checked: boolean) {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "20px",
    height: "20px",
    borderRadius: "6px",
    border: checked ? "1px solid var(--primary)" : "1px solid var(--border-strong)",
    background: checked ? "var(--primary)" : "var(--surface)",
    color: "var(--on-primary)",
  };
}

function modeButtonStyle(active: boolean) {
  return {
    ...smallButtonStyle,
    borderColor: active ? "var(--primary)" : "var(--border-strong)",
    background: active ? "var(--primary-soft)" : "var(--surface-raised)",
    color: active ? "var(--primary-strong)" : "var(--foreground-muted)",
  };
}

function statusStyle(status: string) {
  const color =
    status === "completed" || status === "skipped"
      ? "var(--success)"
      : status === "failed" || status === "cancelled"
        ? "var(--error)"
        : "var(--foreground-muted)";
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "4px 8px",
    borderRadius: "9999px",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    color,
    fontSize: "11px",
    fontWeight: 800,
    textTransform: "capitalize" as const,
  };
}
