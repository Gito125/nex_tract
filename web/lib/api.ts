import type {
  AnalyzeRequest,
  AnalyzeResponse,
  DownloadCreateRequest,
  DownloadJob,
  DownloadQueueResponse,
  HealthResponse,
  HistoryActionResponse,
  HistoryFilters,
  HistoryListResponse,
  AppSettings,
  PlaylistCreateRequest,
  PlaylistResponse,
  PlaylistSizeEstimateRequest,
  PlaylistSizeEstimateResponse,
  SettingsUpdateRequest,
} from "@/lib/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:8000";
const REQUEST_TIMEOUT_MS = 45_000; // 45 seconds timeout for API requests

async function request<T>(
  path: string,
  init?: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

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

export function getApiAssetUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("/api/")) return `${API_BASE_URL}${url}`;
  return url;
}

export function createPlaylist(
  body: PlaylistCreateRequest,
): Promise<PlaylistResponse> {
  return request<PlaylistResponse>("/api/playlists", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getPlaylist(playlistId: string): Promise<PlaylistResponse> {
  return request<PlaylistResponse>(`/api/playlists/${playlistId}`);
}

export function cancelPlaylist(playlistId: string): Promise<PlaylistResponse> {
  return request<PlaylistResponse>(`/api/playlists/${playlistId}/cancel`, {
    method: "POST",
  });
}

export function getPlaylistEventsUrl(playlistId: string): string {
  return `${API_BASE_URL}/api/playlists/${playlistId}/events`;
}

export function estimatePlaylistSizes(
  body: PlaylistSizeEstimateRequest,
): Promise<PlaylistSizeEstimateResponse> {
  return request<PlaylistSizeEstimateResponse>("/api/playlists/size-estimate", {
    method: "POST",
    body: JSON.stringify(body),
  }, 60_000);
}

export function listHistory(
  filters: HistoryFilters = {},
): Promise<HistoryListResponse> {
  const params = new URLSearchParams();

  if (filters.query) params.set("query", filters.query);
  if (filters.status) params.set("status", filters.status);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.offset) params.set("offset", String(filters.offset));

  const suffix = params.toString() ? `?${params.toString()}` : "";
  return request<HistoryListResponse>(`/api/history${suffix}`);
}

export function redownloadHistoryItem(historyId: string): Promise<DownloadJob> {
  return request<DownloadJob>(`/api/history/${historyId}/redownload`, {
    method: "POST",
  });
}

export function openHistoryFile(
  historyId: string,
): Promise<HistoryActionResponse> {
  return request<HistoryActionResponse>(`/api/history/${historyId}/open-file`, {
    method: "POST",
  });
}

export function openHistoryFolder(
  historyId: string,
): Promise<HistoryActionResponse> {
  return request<HistoryActionResponse>(`/api/history/${historyId}/open-folder`, {
    method: "POST",
  });
}

export function getSettings(): Promise<AppSettings> {
  return request<AppSettings>("/api/settings");
}

export function updateSettings(
  body: SettingsUpdateRequest,
): Promise<AppSettings> {
  return request<AppSettings>("/api/settings", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
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
