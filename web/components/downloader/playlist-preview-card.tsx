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
    <section className="animate-fade-up" aria-label="Playlist preview">
      {/* Back */}
      <button
        type="button"
        onClick={onBack}
        style={{
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
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-raised)";
          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-strong)";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--foreground)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "none";
          (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--foreground-muted)";
        }}
      >
        <ArrowLeft size={15} aria-hidden="true" />
        Back to paste
      </button>

      {/* Card */}
      <div
        style={{
          borderRadius: "20px",
          overflow: "hidden",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-lift)",
        }}
      >
        {/* Accent bar */}
        <div
          style={{
            height: "3px",
            background: "linear-gradient(90deg, var(--primary), var(--accent))",
          }}
          aria-hidden="true"
        />

        <div style={{ padding: "32px" }}>
          {/* Icon + title */}
          <div style={{ display: "flex", gap: "20px", alignItems: "flex-start", flexWrap: "wrap" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "64px",
                height: "64px",
                borderRadius: "16px",
                background: "var(--primary-soft)",
                border: "1px solid var(--border-primary)",
                flexShrink: 0,
              }}
            >
              <ListVideo size={28} style={{ color: "var(--primary-strong)" }} aria-hidden="true" />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: "var(--foreground-subtle)",
                  marginBottom: "8px",
                }}
              >
                YouTube Playlist
              </p>

              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(20px, 3vw, 28px)",
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.2,
                  color: "var(--foreground)",
                  marginBottom: "12px",
                  wordBreak: "break-word",
                }}
              >
                {preview.title}
              </h2>

              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "5px 12px",
                    borderRadius: "9999px",
                    background: "var(--accent-soft)",
                    border: "1px solid var(--accent-muted)",
                    color: "var(--accent-strong)",
                    fontSize: "13px",
                    fontWeight: 700,
                  }}
                >
                  <ClipboardList size={13} aria-hidden="true" />
                  {itemCount} {itemCount === 1 ? "item" : "items"}
                </span>
                <p style={{ fontSize: "13px", color: "var(--foreground-muted)" }}>
                  Item selection & bulk download coming in a later phase.
                </p>
              </div>
            </div>
          </div>

          {/* Action */}
          <div
            style={{
              marginTop: "28px",
              paddingTop: "24px",
              borderTop: "1px solid var(--border-soft)",
            }}
          >
            <button
              type="button"
              disabled
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "0 24px",
                minHeight: "46px",
                borderRadius: "10px",
                border: "none",
                background: "var(--primary)",
                color: "var(--on-primary)",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "not-allowed",
                opacity: 0.55,
                fontFamily: "var(--font-body)",
                letterSpacing: "-0.01em",
              }}
            >
              <Download size={16} aria-hidden="true" />
              Download Playlist — Coming Soon
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
