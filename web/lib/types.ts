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
