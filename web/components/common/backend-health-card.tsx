"use client";

import { useQuery } from "@tanstack/react-query";

import { getHealth } from "@/lib/api";

export function BackendHealthCard() {
  const { data, error, isLoading } = useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
  });

  let title = "Checking backend";
  let detail = "Connecting to the local FastAPI service.";
  let statusClass = "bg-[#F59E0B]";

  if (data) {
    title = `${data.app} backend connected`;
    detail = "FastAPI is responding at /api/health.";
    statusClass = "bg-[#10B981]";
  }

  if (error) {
    title = "Backend offline";
    detail = "Start the FastAPI server, then refresh this page.";
    statusClass = "bg-[#EF4444]";
  }

  return (
    <div className="rounded-2xl border border-[#c7c4d8] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.05)] dark:border-[#334155] dark:bg-[#1e293b]">
      <div className="flex items-start gap-3">
        <span
          className={`mt-1 h-3 w-3 rounded-full ${statusClass} ${
            isLoading ? "animate-pulse" : ""
          }`}
          aria-hidden="true"
        />
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-[#464555] dark:text-[#c3c0ff]">
            {detail}
          </p>
        </div>
      </div>
    </div>
  );
}
