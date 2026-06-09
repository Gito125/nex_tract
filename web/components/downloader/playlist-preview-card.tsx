"use client";

import { ArrowLeft, ClipboardList, Download, ListVideo } from "lucide-react";
import type { AnalyzeResponse } from "@/lib/types";

export function PlaylistPreviewCard({
  onBack,
  preview,
}: {
  onBack: () => void;
  preview: AnalyzeResponse;
}) {
  const itemCount = preview.playlist?.itemCount ?? 0;

  return (
    <section
      className="mx-auto flex w-full max-w-3xl flex-col gap-5 animate-fade-up"
      aria-label="Playlist preview"
    >
      {/* Back */}
      <button
        className="flex w-fit items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all"
        onClick={onBack}
        type="button"
        style={{ color: "var(--foreground-muted)" }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-hover)";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--foreground)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--foreground-muted)";
        }}
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Back
      </button>

      {/* Card */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-lift)",
        }}
      >
        {/* Color bar */}
        <div
          style={{
            height: "3px",
            background: "linear-gradient(90deg, var(--primary), var(--accent))",
          }}
          aria-hidden="true"
        />

        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            {/* Icon */}
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl"
              style={{
                background: "var(--primary-soft)",
                border: "1px solid var(--border-primary)",
              }}
            >
              <ListVideo size={28} style={{ color: "var(--primary-strong)" }} aria-hidden="true" />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                className="mb-2 text-xs font-bold uppercase tracking-widest"
                style={{ color: "var(--foreground-soft)" }}
              >
                YouTube Playlist
              </p>

              <h2
                className="text-2xl font-bold leading-snug sm:text-3xl"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  color: "var(--foreground)",
                  letterSpacing: "-0.02em",
                }}
              >
                {preview.title}
              </h2>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold"
                  style={{
                    background: "var(--accent-soft)",
                    border: "1px solid var(--accent-muted)",
                    color: "var(--accent-strong)",
                  }}
                >
                  <ClipboardList size={13} aria-hidden="true" />
                  {itemCount} {itemCount === 1 ? "item" : "items"}
                </span>
                <p className="text-sm" style={{ color: "var(--foreground-muted)" }}>
                  Item selection & bulk download in a later phase.
                </p>
              </div>
            </div>
          </div>

          {/* Action */}
          <div
            className="mt-8 pt-6"
            style={{ borderTop: "1px solid var(--border-soft)" }}
          >
            <button
              className="flex min-h-12 items-center justify-center gap-2.5 rounded-xl px-8 text-sm font-bold cursor-not-allowed"
              disabled
              type="button"
              style={{
                background: "var(--primary)",
                color: "#fff",
                opacity: 0.6,
                boxShadow: "0 4px 16px var(--primary-glow)",
              }}
            >
              <Download size={18} aria-hidden="true" />
              Download Playlist — Coming Soon
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}