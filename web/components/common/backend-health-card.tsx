"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, LoaderCircle, WifiOff } from "lucide-react";

import { getHealth } from "@/lib/api";

export function BackendHealthCard() {
  const { data, error, isLoading } = useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
  });

  let title = "Checking backend";
  let detail = "Connecting to the local FastAPI service.";
  let statusClass = "bg-[var(--warning)]";
  let Icon = LoaderCircle;

  if (data) {
    title = "Local API online";
    detail = `${data.app} is responding at /api/health.`;
    statusClass = "bg-[var(--success)]";
    Icon = CheckCircle2;
  }

  if (error) {
    title = "Local API offline";
    detail = "Start the FastAPI server, then refresh this page.";
    statusClass = "bg-[var(--error)]";
    Icon = WifiOff;
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-start gap-3 text-left">
        <span
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${statusClass} text-white`}
          aria-hidden="true"
        >
          <Icon size={17} className={isLoading ? "animate-spin" : ""} />
        </span>
        <div>
          <h2 className="text-sm font-bold">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--foreground-muted)]">
            {detail}
          </p>
        </div>
      </div>
    </div>
  );
}
