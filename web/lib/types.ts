export type HealthResponse = {
  status: "ok";
  app: string;
};

export type QualityOption = {
  id:
    | "best"
    | "1080p"
    | "720p"
    | "480p"
    | "360p"
    | "audio_m4a"
    | "audio_mp3"
    | "audio_opus";
  label: string;
  kind: "video" | "audio";
};

export type MediaPreviewData = {
  title: string;
  creator: string;
  platform: "YouTube";
  duration: string;
  thumbnailUrl: string;
  qualityOptions: QualityOption[];
};
