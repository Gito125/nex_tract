import { Cpu } from "lucide-react";

export function GenericEngineIndicator({ isGeneric }: { isGeneric?: boolean }) {
  if (!isGeneric) return null;
  return (
    <div
      style={{
        fontSize: "11px",
        fontWeight: 600,
        color: "var(--foreground-muted)",
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        marginBottom: "12px",
        marginLeft: "8px",
      }}
    >
      <Cpu size={12} />
      Detected via generic engine
    </div>
  );
}
