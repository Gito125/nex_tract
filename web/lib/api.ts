import type {
  AnalyzeRequest,
  AnalyzeResponse,
  DownloadCreateRequest,
  DownloadJob,
  DownloadQueueResponse,
  HealthResponse,
} from "@/lib/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:8000";
const REQUEST_TIMEOUT_MS = 30_000; // 30 seconds timeout for API requests

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("Request timed out. Please try again.", 504);
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new ApiError(message, response.status);
  }

  return response.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

export function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/api/health");
}

export function analyzeUrl(url: string): Promise<AnalyzeResponse> {
  const body: AnalyzeRequest = { url };

  return request<AnalyzeResponse>("/api/analyze", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function createDownload(
  body: DownloadCreateRequest,
): Promise<DownloadJob> {
  return request<DownloadJob>("/api/downloads", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function listDownloads(): Promise<DownloadQueueResponse> {
  return request<DownloadQueueResponse>("/api/downloads");
}

export function cancelDownload(jobId: string): Promise<DownloadJob> {
  return request<DownloadJob>(`/api/downloads/${jobId}/cancel`, {
    method: "POST",
  });
}

export function retryDownload(jobId: string): Promise<DownloadJob> {
  return request<DownloadJob>(`/api/downloads/${jobId}/retry`, {
    method: "POST",
  });
}

export function getDownloadEventsUrl(jobId: string): string {
  return `${API_BASE_URL}/api/downloads/${jobId}/events`;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { detail?: unknown };

    if (typeof payload.detail === "string" && payload.detail.trim()) {
      return payload.detail;
    }
  } catch {
    // Fall through to the generic message.
  }

  if (response.status >= 500) {
    return "Nextract backend is not responding.";
  }

  return "Please check the link and try again.";
}
