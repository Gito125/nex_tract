"use client";

import { useEffect, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Folder,
  LoaderCircle,
  Moon,
  Save,
  Settings,
  Sun,
  Monitor,
  FileText,
  Layers,
  SkipForward,
} from "lucide-react";

import { applyTheme } from "@/app/providers";
import { getSettings, updateSettings } from "@/lib/api";
import type {
  AppSettings,
  AudioFormat,
  DefaultQuality,
  SettingsUpdateRequest,
  ThemeValue,
} from "@/lib/types";

const qualityOptions: Array<{ label: string; value: DefaultQuality }> = [
  { label: "Best",  value: "best"  },
  { label: "1080p", value: "1080p" },
  { label: "720p",  value: "720p"  },
  { label: "480p",  value: "480p"  },
  { label: "360p",  value: "360p"  },
  { label: "Audio", value: "audio" },
];

const audioOptions: Array<{ label: string; value: AudioFormat }> = [
  { label: "M4A",  value: "m4a"  },
  { label: "MP3",  value: "mp3"  },
  { label: "OPUS", value: "opus" },
];

const themeOptions: Array<{ icon: React.ElementType; label: string; value: ThemeValue }> = [
  { icon: Monitor, label: "System", value: "system" },
  { icon: Sun,     label: "Light",  value: "light"  },
  { icon: Moon,    label: "Dark",   value: "dark"   },
];

export function SettingsPage() {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  const [draft, setDraft] = useState<SettingsUpdateRequest | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const form = draft ?? (settingsQuery.data ? toForm(settingsQuery.data) : null);

  useEffect(() => {
    if (!settingsQuery.data) return;
    applyTheme(settingsQuery.data.theme);
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: (settings) => {
      setDraft(toForm(settings));
      applyTheme(settings.theme);
      setSavedMessage("Settings saved successfully.");
      queryClient.setQueryData(["settings"], settings);
    },
  });

  if (settingsQuery.isLoading || !form) {
    return (
      <PageFrame>
        <LoadingState label="Loading settings…" />
      </PageFrame>
    );
  }

  if (settingsQuery.error) {
    return (
      <PageFrame>
        <LoadingState label={settingsQuery.error.message} isError />
      </PageFrame>
    );
  }

  const saveError = saveMutation.error?.message ?? null;

  function handleThemeChange(theme: ThemeValue) {
    updateForm(setDraft, { theme });
    applyTheme(theme);
  }

  return (
    <PageFrame>
      {/* Header */}
      <header style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "4px 12px",
              borderRadius: "9999px",
              background: "var(--primary-soft)",
              border: "1px solid var(--border-primary)",
              color: "var(--primary-strong)",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            <Settings size={11} aria-hidden="true" />
            Preferences
          </span>
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(26px, 4vw, 36px)",
            fontWeight: 800,
            letterSpacing: "-0.04em",
            color: "var(--foreground)",
            lineHeight: 1.1,
            marginBottom: "6px",
          }}
        >
          Settings
        </h1>
        <p style={{ fontSize: "14px", color: "var(--foreground-muted)", maxWidth: "460px", lineHeight: 1.55 }}>
          Defaults here affect new downloads immediately. Existing queue items keep their original choices.
        </p>
      </header>

      {/* Notices */}
      {savedMessage && <Notice tone="success" message={savedMessage} onDismiss={() => setSavedMessage(null)} />}
      {saveError    && <Notice tone="error"   message={saveError} />}

      {/* Form */}
      <form
        style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        onSubmit={(e) => {
          e.preventDefault();
          setSavedMessage(null);
          saveMutation.mutate(form);
        }}
      >
        {/* ── Storage ── */}
        <SettingsSection
          icon={Folder}
          title="Storage"
          description="Where Nextract saves downloaded files. The backend checks that this folder exists and is writable."
        >
          {/* Download folder */}
          <FieldGroup label="Download folder" icon={Folder}>
            <input
              value={form.downloadFolder ?? ""}
              onChange={(e) => updateForm(setDraft, { downloadFolder: e.target.value })}
              placeholder="/Users/you/Downloads/Nextract"
              style={inputStyle}
              onFocus={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = "var(--primary)"; (e.currentTarget as HTMLInputElement).style.boxShadow = "0 0 0 3px var(--primary-glow)"; }}
              onBlur={(e)  => { (e.currentTarget as HTMLInputElement).style.borderColor = "var(--border-strong)"; (e.currentTarget as HTMLInputElement).style.boxShadow = "none"; }}
            />
          </FieldGroup>

          {/* Filename template */}
          <FieldGroup
            label="Filename template"
            icon={FileText}
            hint={<>Use <code style={codeStyle}>{"{title}"}</code>, <code style={codeStyle}>{"{id}"}</code>, <code style={codeStyle}>{"{quality}"}</code>, <code style={codeStyle}>{"{platform}"}</code>.</>}
          >
            <input
              value={form.filenameTemplate ?? ""}
              onChange={(e) => updateForm(setDraft, { filenameTemplate: e.target.value })}
              placeholder="{title} [{quality}]"
              style={inputStyle}
              onFocus={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = "var(--primary)"; (e.currentTarget as HTMLInputElement).style.boxShadow = "0 0 0 3px var(--primary-glow)"; }}
              onBlur={(e)  => { (e.currentTarget as HTMLInputElement).style.borderColor = "var(--border-strong)"; (e.currentTarget as HTMLInputElement).style.boxShadow = "none"; }}
            />
          </FieldGroup>

          {/* Skip existing toggle */}
          <ToggleRow
            icon={SkipForward}
            label="Skip existing downloads"
            description="Prevents starting a duplicate if a completed download already exists."
            checked={form.skipExisting ?? false}
            onChange={(v) => updateForm(setDraft, { skipExisting: v })}
          />
        </SettingsSection>

        {/* ── Download defaults ── */}
        <SettingsSection
          icon={Layers}
          title="Download Defaults"
          description="Pre-selected values shown after a link is analyzed. You can always change them per download."
        >
          <SegmentedControl
            label="Default quality"
            options={qualityOptions}
            value={form.defaultQuality ?? "best"}
            onChange={(v) => updateForm(setDraft, { defaultQuality: v })}
          />
          <SegmentedControl
            label="Default audio format"
            options={audioOptions}
            value={form.defaultAudioFormat ?? "m4a"}
            onChange={(v) => updateForm(setDraft, { defaultAudioFormat: v })}
          />
        </SettingsSection>

        {/* ── Appearance ── */}
        <SettingsSection
          icon={Sun}
          title="Appearance"
          description="Theme is applied across the entire app instantly when you change it."
        >
          <div>
            <p style={fieldLabelStyle}>Theme</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginTop: "8px" }}>
              {themeOptions.map((opt) => {
                const Icon = opt.icon;
                const active = form.theme === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleThemeChange(opt.value)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      padding: "14px 8px",
                      borderRadius: "10px",
                      border: active ? "1.5px solid var(--primary)" : "1.5px solid var(--border-strong)",
                      background: active ? "var(--primary-soft)" : "var(--surface-raised)",
                      color: active ? "var(--primary-strong)" : "var(--foreground-muted)",
                      fontSize: "13px",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "var(--font-body)",
                      transition: "all 0.15s var(--ease-out)",
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-hover)";
                        (e.currentTarget as HTMLButtonElement).style.color = "var(--foreground)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-raised)";
                        (e.currentTarget as HTMLButtonElement).style.color = "var(--foreground-muted)";
                      }
                    }}
                  >
                    <Icon size={18} aria-hidden="true" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </SettingsSection>

        {/* Save button */}
        <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "4px" }}>
          <button
            type="submit"
            disabled={saveMutation.isPending}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "0 28px",
              height: "48px",
              borderRadius: "12px",
              border: "none",
              background: "var(--primary)",
              color: "#fff",
              fontSize: "14px",
              fontWeight: 700,
              cursor: saveMutation.isPending ? "wait" : "pointer",
              opacity: saveMutation.isPending ? 0.7 : 1,
              boxShadow: "0 4px 16px var(--primary-glow)",
              fontFamily: "var(--font-body)",
              transition: "all 0.2s var(--ease-out)",
              letterSpacing: "-0.01em",
            }}
            onMouseEnter={(e) => {
              if (!saveMutation.isPending) {
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 22px var(--primary-glow)";
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 16px var(--primary-glow)";
            }}
          >
            {saveMutation.isPending ? (
              <LoaderCircle size={15} aria-hidden="true" style={{ animation: "spin 0.8s linear infinite" }} />
            ) : (
              <Save size={15} aria-hidden="true" />
            )}
            Save settings
          </button>
        </div>
      </form>
    </PageFrame>
  );
}

/* ── Layout components ──────────────────────────────────────────── */

function PageFrame({ children }: { children: ReactNode }) {
  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 24px 64px" }}>
      {children}
    </div>
  );
}

function SettingsSection({
  children,
  description,
  icon: Icon,
  title,
}: {
  children: ReactNode;
  description: string;
  icon: React.ElementType;
  title: string;
}) {
  return (
    <section
      style={{
        borderRadius: "18px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-soft)",
        overflow: "hidden",
      }}
    >
      {/* Section header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "20px 24px 16px",
          borderBottom: "1px solid var(--border-soft)",
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "32px",
            height: "32px",
            borderRadius: "8px",
            background: "var(--primary-soft)",
            border: "1px solid var(--border-primary)",
            flexShrink: 0,
          }}
        >
          <Icon size={15} style={{ color: "var(--primary-strong)" }} aria-hidden="true" />
        </span>
        <div>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "16px",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--foreground)",
              lineHeight: 1.2,
            }}
          >
            {title}
          </h2>
          <p style={{ fontSize: "12px", color: "var(--foreground-muted)", marginTop: "2px", lineHeight: 1.4 }}>
            {description}
          </p>
        </div>
      </div>

      {/* Section body */}
      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "18px" }}>
        {children}
      </div>
    </section>
  );
}

function FieldGroup({
  children,
  hint,
  icon: Icon,
  label,
}: {
  children: ReactNode;
  hint?: ReactNode;
  icon?: React.ElementType;
  label: string;
}) {
  return (
    <div>
      <label style={{ display: "block" }}>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "13px",
            fontWeight: 700,
            color: "var(--foreground-muted)",
            marginBottom: "8px",
          }}
        >
          {Icon && <Icon size={14} aria-hidden="true" />}
          {label}
        </span>
        {children}
      </label>
      {hint && (
        <p style={{ fontSize: "12px", color: "var(--foreground-soft)", marginTop: "6px", lineHeight: 1.5 }}>
          {hint}
        </p>
      )}
    </div>
  );
}

function ToggleRow({
  checked,
  description,
  icon: Icon,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  icon?: React.ElementType;
  label: string;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        padding: "14px 16px",
        borderRadius: "10px",
        border: "1px solid var(--border-strong)",
        background: "var(--surface-raised)",
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
        {Icon && (
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "28px",
              height: "28px",
              borderRadius: "7px",
              background: "var(--surface-strong)",
              flexShrink: 0,
              marginTop: "1px",
            }}
          >
            <Icon size={14} style={{ color: "var(--foreground-soft)" }} aria-hidden="true" />
          </span>
        )}
        <div>
          <span style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--foreground)", marginBottom: "2px" }}>
            {label}
          </span>
          <span style={{ display: "block", fontSize: "12px", color: "var(--foreground-muted)", lineHeight: 1.4 }}>
            {description}
          </span>
        </div>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{
          width: "18px",
          height: "18px",
          accentColor: "var(--primary)",
          flexShrink: 0,
          cursor: "pointer",
        }}
      />
    </label>
  );
}

function SegmentedControl<T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (v: T) => void;
  options: Array<{ label: string; value: T }>;
  value: T;
}) {
  return (
    <div>
      <p style={fieldLabelStyle}>{label}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "7px", marginTop: "8px" }}>
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              style={{
                padding: "7px 16px",
                borderRadius: "9999px",
                border: active ? "1.5px solid var(--primary)" : "1.5px solid var(--border-strong)",
                background: active ? "var(--primary)" : "var(--surface-raised)",
                color: active ? "#fff" : "var(--foreground-muted)",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "var(--font-body)",
                transition: "all 0.15s var(--ease-out)",
                boxShadow: active ? "0 2px 8px var(--primary-glow)" : "none",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-hover)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--foreground)";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-raised)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--foreground-muted)";
                }
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Notice({
  message,
  tone,
  onDismiss,
}: {
  message: string;
  tone: "success" | "error";
  onDismiss?: () => void;
}) {
  const ok = tone === "success";
  return (
    <div
      role={ok ? "status" : "alert"}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "10px",
        padding: "12px 16px",
        borderRadius: "10px",
        marginBottom: "16px",
        background: ok ? "var(--success-soft)" : "var(--error-soft)",
        border: `1px solid ${ok ? "oklch(64% 0.17 155 / 0.4)" : "oklch(66% 0.22 22 / 0.4)"}`,
        color: ok ? "var(--success)" : "var(--error)",
        fontSize: "13px",
        fontWeight: 600,
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {ok ? <CheckCircle2 size={15} aria-hidden="true" /> : <Settings size={15} aria-hidden="true" />}
        {message}
      </span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontSize: "18px", lineHeight: 1 }}
          aria-label="Dismiss"
        >
          ×
        </button>
      )}
    </div>
  );
}

function LoadingState({ label, isError }: { label: string; isError?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "280px",
        borderRadius: "18px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        color: isError ? "var(--error)" : "var(--foreground-muted)",
        gap: "10px",
        textAlign: "center",
        padding: "40px",
      }}
    >
      <LoaderCircle
        size={26}
        aria-hidden="true"
        style={{ animation: isError ? "none" : "spin 0.8s linear infinite" }}
      />
      <p style={{ fontSize: "13px", fontWeight: 600 }}>{label}</p>
    </div>
  );
}

/* ── Style constants ────────────────────────────────────────────── */
const inputStyle: React.CSSProperties = {
  width: "100%",
  height: "44px",
  padding: "0 14px",
  borderRadius: "10px",
  border: "1.5px solid var(--border-strong)",
  background: "var(--surface-raised)",
  color: "var(--foreground)",
  fontSize: "14px",
  fontFamily: "var(--font-body)",
  outline: "none",
  transition: "border-color 0.2s, box-shadow 0.2s",
};

const fieldLabelStyle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 700,
  color: "var(--foreground-muted)",
};

const codeStyle: React.CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: "11px",
  padding: "1px 5px",
  borderRadius: "4px",
  background: "var(--surface-strong)",
  border: "1px solid var(--border-strong)",
  color: "var(--primary-strong)",
};

/* ── Data helpers ───────────────────────────────────────────────── */
function toForm(settings: AppSettings): SettingsUpdateRequest {
  return {
    downloadFolder:    settings.downloadFolder,
    defaultQuality:    settings.defaultQuality,
    defaultAudioFormat: settings.defaultAudioFormat,
    theme:             settings.theme,
    filenameTemplate:  settings.filenameTemplate,
    skipExisting:      settings.skipExisting,
  };
}

function updateForm(
  setForm: Dispatch<SetStateAction<SettingsUpdateRequest | null>>,
  patch: SettingsUpdateRequest,
) {
  setForm((current) => ({ ...(current ?? {}), ...patch }));
}