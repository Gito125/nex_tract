import { CirclePlay } from "lucide-react";
import { PLATFORM_META } from "@/lib/platforms";
import type { PlatformValue } from "@/lib/types";

const YoutubeLogo = ({ size = 14 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" height={size} width={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
  </svg>
);

export function PlatformBadge({ platform }: { platform: PlatformValue }) {
  const meta = PLATFORM_META[platform];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "4px 10px",
        borderRadius: "6px",
        background: meta.background,
        border: `1px solid ${meta.border}`,
        color: meta.color,
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: "0.02em",
        marginBottom: "12px",
      }}
    >
      {platform === "youtube" ? (
        <YoutubeLogo size={11} />
      ) : (
        <CirclePlay size={11} aria-hidden="true" />
      )}
      {meta.label}
    </span>
  );
}
