"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, LoaderCircle, WifiOff } from "lucide-react";
import { getHealth } from "@/lib/api";

export function BackendHealthCard() {
  const { data, error, isLoading } = useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
  });

  let label = "Connecting…";
  let detail = "Reaching local service";
  let dotColor = "var(--warning)";
  let Icon = LoaderCircle;

  if (data) {
    label = "API Online";
    detail = "/api/health · OK";
    dotColor = "var(--success)";
    Icon = CheckCircle2;
  }

  if (error) {
    label = "API Offline";
    detail = "Start FastAPI server";
    dotColor = "var(--error)";
    Icon = WifiOff;
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "10px 12px",
        borderRadius: "10px",
        background: "oklch(100% 0 0 / 0.04)",
        border: "1px solid oklch(100% 0 0 / 0.07)",
      }}
    >
      {/* Dot indicator */}
      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "28px",
          height: "28px",
          borderRadius: "8px",
          background: `${dotColor}20`,
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        <Icon
          size={13}
          style={{
            color: dotColor,
            animation: isLoading ? "spin 0.8s linear infinite" : "none",
          }}
        />
      </span>

      <div style={{ minWidth: 0 }}>
        <p
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: dotColor,
            lineHeight: 1.2,
          }}
        >
          {label}
        </p>
        <p
          style={{
            fontSize: "11px",
            color: "var(--sidebar-muted)",
            marginTop: "2px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {detail}
        </p>
      </div>
    </div>
  );
}