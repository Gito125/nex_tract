export type HealthResponse = {
  status: "ok";
  app: string;
};

export type AnalyzeRequest = {
  url: string;
};

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

export type PlaylistSummary = {
  id: string | null;
  title: string | null;
  itemCount: number;
};

export type AnalyzeResponse = {
  platform: "youtube";
  type: "video" | "playlist";
  title: string;
  thumbnail: string | null;
  duration: number | null;
  creator: string | null;
  webpageUrl: string;
  qualities: QualityOption[];
  rawFormats: RawFormat[];
  playlist: PlaylistSummary | null;
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

export type DownloadJob = {
  id: string;
  url: string;
  platform: "youtube";
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
