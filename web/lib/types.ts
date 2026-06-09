export type HealthResponse = {
  status: "ok";
  app: string;
};

export type AnalyzeRequest = {
  url: string;
};

export type PlatformValue = "youtube" | "tiktok" | "instagram" | "x";

export type QualityValue =
  | "best"
  | "1080p"
  | "720p"
  | "480p"
  | "360p"
  | "audio_m4a"
  | "audio_mp3"
  | "audio_opus";

export type QualityOption = {
  value: QualityValue;
  label: string;
  available: boolean;
  kind: "video" | "audio";
};

export type RawFormat = {
  formatId: string | null;
  ext: string | null;
  height: number | null;
  width: number | null;
  fps: number | null;
  vcodec: string | null;
  acodec: string | null;
  filesize: number | null;
  tbr: number | null;
};

export type PlaylistAnalyzeItem = {
  index: number;
  title: string;
  url: string;
  thumbnail: string | null;
  duration: number | null;
  available: boolean;
  errorMessage: string | null;
};

export type PlaylistSummary = {
  id: string | null;
  title: string | null;
  itemCount: number;
  items: PlaylistAnalyzeItem[];
};

export type AnalyzeResponse = {
  platform: PlatformValue;
  type: "video" | "playlist";
  title: string;
  thumbnail: string | null;
  duration: number | null;
  creator: string | null;
  webpageUrl: string;
  qualities: QualityOption[];
  rawFormats: RawFormat[];
  playlist: PlaylistSummary | null;
  notice: string | null;
};

export type DownloadStatus =
  | "pending"
  | "downloading"
  | "completed"
  | "failed"
  | "cancelled";

export type ProgressStatus =
  | "queued"
  | "downloading"
  | "merging"
  | "postprocessing"
  | "completed"
  | "failed"
  | "cancelled";

export type DownloadType = "video" | "audio";
export type AudioFormat = "m4a" | "mp3" | "opus";

export type DownloadCreateRequest = {
  url: string;
  quality: QualityValue;
  downloadType: DownloadType;
  audioFormat: AudioFormat | null;
};

export type PlaylistCreateRequest = {
  url: string;
  quality: QualityValue;
  downloadType: DownloadType;
  audioFormat: AudioFormat | null;
  selectedIndexes?: number[];
  rangeStart?: number;
  rangeEnd?: number;
  skipExisting?: boolean;
};

export type PlaylistSizeEstimateRequest = {
  items: Array<{
    index: number;
    url: string;
  }>;
  qualities?: QualityValue[];
};

export type DownloadJob = {
  id: string;
  url: string;
  platform: PlatformValue;
  mediaType: "video";
  title: string;
  thumbnail: string | null;
  duration: number | null;
  selectedQuality: QualityValue;
  audioFormat: AudioFormat | null;
  status: DownloadStatus;
  progress: number;
  speed: string | null;
  eta: string | null;
  progressStatus: ProgressStatus;
  outputPath: string | null;
  fileSize: number | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type DownloadQueueResponse = {
  jobs: DownloadJob[];
};

export type PlaylistStatus =
  | "pending"
  | "downloading"
  | "completed"
  | "failed"
  | "cancelled";

export type PlaylistItemStatus =
  | "queued"
  | "downloading"
  | "completed"
  | "failed"
  | "skipped"
  | "cancelled";

export type PlaylistItem = {
  id: string;
  playlistId: string;
  url: string;
  title: string;
  thumbnail: string | null;
  duration: number | null;
  itemIndex: number;
  status: PlaylistItemStatus;
  progress: number;
  speed: string | null;
  eta: string | null;
  progressStatus: ProgressStatus;
  outputPath: string | null;
  fileSize: number | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type PlaylistResponse = {
  id: string;
  url: string;
  platform: PlatformValue;
  title: string;
  thumbnail: string | null;
  totalItems: number;
  completedItems: number;
  failedItems: number;
  skippedItems: number;
  cancelledItems: number;
  selectedQuality: QualityValue;
  audioFormat: AudioFormat | null;
  skipExisting: boolean;
  status: PlaylistStatus;
  progress: number;
  currentItemIndex: number | null;
  currentItemTitle: string | null;
  currentItemProgress: number | null;
  speed: string | null;
  eta: string | null;
  outputPath: string | null;
  errorMessage: string | null;
  items: PlaylistItem[];
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type PlaylistQualitySizeEstimate = {
  quality: QualityValue;
  totalBytes: number | null;
  estimatedItems: number;
  unavailableItems: number;
  estimateKind: "exact" | "approximate" | "unknown";
};

export type PlaylistSizeEstimateResponse = {
  requestedItems: number;
  analyzedItems: number;
  failedItems: number;
  estimates: PlaylistQualitySizeEstimate[];
};

export type HistoryStatus = "completed" | "failed";

export type HistoryItem = {
  id: string;
  jobId: string;
  url: string;
  platform: PlatformValue;
  mediaType: "video";
  title: string;
  thumbnail: string | null;
  duration: number | null;
  selectedQuality: QualityValue;
  audioFormat: AudioFormat | null;
  status: HistoryStatus;
  outputPath: string | null;
  downloadFolder: string | null;
  fileSize: number | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string;
};

export type HistoryListResponse = {
  items: HistoryItem[];
  total: number;
  limit: number;
  offset: number;
};

export type HistoryFilters = {
  query?: string;
  status?: HistoryStatus;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
};

export type HistoryActionResponse = {
  message: string;
};

export type DefaultQuality = "best" | "1080p" | "720p" | "480p" | "360p" | "audio";
export type ThemeValue = "system" | "light" | "dark";

export type AppSettings = {
  downloadFolder: string;
  defaultQuality: DefaultQuality;
  defaultAudioFormat: AudioFormat;
  theme: ThemeValue;
  filenameTemplate: string;
  skipExisting: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SettingsUpdateRequest = Partial<
  Pick<
    AppSettings,
    | "downloadFolder"
    | "defaultQuality"
    | "defaultAudioFormat"
    | "theme"
    | "filenameTemplate"
    | "skipExisting"
  >
>;
