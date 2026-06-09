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
  let detail = "Reaching local FastAPI service";
  let color = "var(--warning)";
  let bg = "var(--warning-soft)";
  let Icon = LoaderCircle;

  if (data) {
    label = "API Online";
    detail = `${data.app} · /api/health`;
    color = "var(--success)";
    bg = "var(--success-soft)";
    Icon = CheckCircle2;
  }

  if (error) {
    label = "API Offline";
    detail = "Start FastAPI, then refresh";
    color = "var(--error)";
    bg = "var(--error-soft)";
    Icon = WifiOff;
  }

  return (
    <div
      className="flex items-center gap-3 rounded-lg px-3 py-2.5"
      style={{
        background: bg,
        border: `1px solid ${color}30`,
      }}
    >
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
        style={{ background: `${color}20`, color }}
        aria-hidden="true"
      >
        <Icon
          size={14}
          className={isLoading ? "animate-spin" : ""}
        />
      </span>
      <div className="min-w-0">
        <p
          className="text-xs font-bold leading-none"
          style={{ color }}
        >
          {label}
        </p>
        <p
          className="mt-1 truncate text-xs"
          style={{ color: "var(--foreground-muted)" }}
        >
          {detail}
        </p>
      </div>
    </div>
  );
}