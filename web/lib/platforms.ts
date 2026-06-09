import type { PlatformValue } from "@/lib/types";

export type PlatformMeta = {
  label: string;
  fallbackCreator: string;
  color: string;
  background: string;
  border: string;
};

export const PLATFORM_META: Record<PlatformValue, PlatformMeta> = {
  youtube: {
    label: "YouTube",
    fallbackCreator: "YouTube",
    color: "#CC2020",
    background: "oklch(96% 0.02 22)",
    border: "oklch(88% 0.06 22)",
  },
  tiktok: {
    label: "TikTok",
    fallbackCreator: "TikTok",
    color: "#111111",
    background: "oklch(97% 0.01 255)",
    border: "oklch(87% 0.03 255)",
  },
  instagram: {
    label: "Instagram",
    fallbackCreator: "Instagram",
    color: "#B83280",
    background: "oklch(96% 0.03 340)",
    border: "oklch(86% 0.07 340)",
  },
  x: {
    label: "X",
    fallbackCreator: "X",
    color: "var(--foreground)",
    background: "var(--surface-raised)",
    border: "var(--border-strong)",
  },
};

export function platformLabel(platform: PlatformValue): string {
  return PLATFORM_META[platform].label;
}
