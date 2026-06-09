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
  { label: "Best", value: "best" },
  { label: "1080p", value: "1080p" },
  { label: "720p", value: "720p" },
  { label: "480p", value: "480p" },
  { label: "360p", value: "360p" },
  { label: "Audio", value: "audio" },
];

const audioOptions: Array<{ label: string; value: AudioFormat }> = [
  { label: "M4A", value: "m4a" },
  { label: "MP3", value: "mp3" },
  { label: "OPUS", value: "opus" },
];

const themeOptions: Array<{ icon: typeof Moon; label: string; value: ThemeValue }> = [
  { icon: Settings, label: "System", value: "system" },
  { icon: Sun, label: "Light", value: "light" },
  { icon: Moon, label: "Dark", value: "dark" },
];

export function SettingsPage() {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });
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
      setSavedMessage("Settings saved.");
      queryClient.setQueryData(["settings"], settings);
    },
  });

  if (settingsQuery.isLoading || !form) {
    return (
      <PageFrame>
        <StateBlock label="Loading settings" spinning />
      </PageFrame>
    );
  }

  if (settingsQuery.error) {
    return (
      <PageFrame>
        <StateBlock label={settingsQuery.error.message} />
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
      <header className="mb-7 flex flex-col gap-3">
        <span
          className="inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest"
          style={{
            background: "var(--primary-soft)",
            border: "1px solid var(--border-primary)",
            color: "var(--primary-strong)",
          }}
        >
          <Settings size={13} aria-hidden="true" />
          Preferences
        </span>
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Settings</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6" style={{ color: "var(--foreground-muted)" }}>
            Defaults here affect new downloads immediately. Existing queue items keep their original choices.
          </p>
        </div>
      </header>

      {savedMessage ? <Notice tone="success" message={savedMessage} /> : null}
      {saveError ? <Notice tone="error" message={saveError} /> : null}

      <form
        className="grid gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          setSavedMessage(null);
          saveMutation.mutate(form);
        }}
      >
        <SettingsSection
          description="Choose where Nextract writes files. The backend validates that this folder exists and is writable."
          title="Storage"
        >
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-bold">
              <Folder size={15} aria-hidden="true" />
              Download folder
            </span>
            <input
              className="h-12 w-full rounded-lg border bg-transparent px-3 text-sm"
              onChange={(event) => updateForm(setDraft, { downloadFolder: event.target.value })}
              style={{ borderColor: "var(--border-strong)", color: "var(--foreground)" }}
              value={form.downloadFolder ?? ""}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-bold">Filename template</span>
            <input
              className="h-12 w-full rounded-lg border bg-transparent px-3 text-sm"
              onChange={(event) => updateForm(setDraft, { filenameTemplate: event.target.value })}
              style={{ borderColor: "var(--border-strong)", color: "var(--foreground)" }}
              value={form.filenameTemplate ?? ""}
            />
            <p className="mt-2 text-xs leading-5" style={{ color: "var(--foreground-soft)" }}>
              Supported fields: {"{title}"}, {"{id}"}, {"{quality}"}, {"{platform}"}.
            </p>
          </label>

          <label className="flex items-center justify-between gap-4 rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
            <span>
              <span className="block text-sm font-bold">Skip existing</span>
              <span className="text-xs" style={{ color: "var(--foreground-soft)" }}>
                Prevents starting a duplicate completed download.
              </span>
            </span>
            <input
              checked={form.skipExisting ?? false}
              className="h-5 w-5 accent-[var(--primary)]"
              onChange={(event) => updateForm(setDraft, { skipExisting: event.target.checked })}
              type="checkbox"
            />
          </label>
        </SettingsSection>

        <SettingsSection
          description="These values are used as the preferred selection after a link is analyzed."
          title="Download Defaults"
        >
          <SegmentedControl
            label="Default quality"
            options={qualityOptions}
            value={form.defaultQuality ?? "best"}
            onChange={(value) => updateForm(setDraft, { defaultQuality: value })}
          />

          <SegmentedControl
            label="Default audio format"
            options={audioOptions}
            value={form.defaultAudioFormat ?? "m4a"}
            onChange={(value) => updateForm(setDraft, { defaultAudioFormat: value })}
          />
        </SettingsSection>

        <SettingsSection
          description="Theme changes are applied across the app when settings are saved."
          title="Appearance"
        >
          <div>
            <p className="mb-3 text-sm font-bold">Theme</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const active = form.theme === option.value;
                return (
                  <button
                    className="flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-bold transition-all active:scale-95"
                    key={option.value}
                    onClick={() => handleThemeChange(option.value)}
                    style={{
                      background: active ? "var(--primary)" : "var(--surface-raised)",
                      borderColor: active ? "var(--primary)" : "var(--border-strong)",
                      color: active ? "#fff" : "var(--foreground-muted)",
                    }}
                    type="button"
                  >
                    <Icon size={15} aria-hidden="true" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </SettingsSection>

        <div className="flex justify-end">
          <button
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition-all active:scale-95 disabled:cursor-wait disabled:opacity-60"
            disabled={saveMutation.isPending}
            style={{
              background: "var(--primary)",
              color: "#fff",
              boxShadow: "0 4px 16px var(--primary-glow)",
            }}
            type="submit"
          >
            {saveMutation.isPending ? (
              <LoaderCircle className="animate-spin" size={16} aria-hidden="true" />
            ) : (
              <Save size={16} aria-hidden="true" />
            )}
            Save settings
          </button>
        </div>
      </form>
    </PageFrame>
  );
}

function PageFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8 sm:px-8 lg:px-12 lg:py-10">
      {children}
    </div>
  );
}

function SettingsSection({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <section
      className="grid gap-5 rounded-2xl p-5 lg:grid-cols-[220px_1fr]"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="mt-2 text-sm leading-6" style={{ color: "var(--foreground-muted)" }}>
          {description}
        </p>
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

function SegmentedControl<T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: T) => void;
  options: Array<{ label: string; value: T }>;
  value: T;
}) {
  return (
    <div>
      <p className="mb-3 text-sm font-bold">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              className="min-h-10 rounded-lg border px-3 text-sm font-bold transition-all active:scale-95"
              key={option.value}
              onClick={() => onChange(option.value)}
              style={{
                background: active ? "var(--primary)" : "var(--surface-raised)",
                borderColor: active ? "var(--primary)" : "var(--border-strong)",
                color: active ? "#fff" : "var(--foreground-muted)",
              }}
              type="button"
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Notice({ message, tone }: { message: string; tone: "success" | "error" }) {
  const Icon = tone === "success" ? CheckCircle2 : Settings;
  return (
    <p
      className="mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold"
      role={tone === "error" ? "alert" : "status"}
      style={{
        background: tone === "success" ? "var(--success-soft)" : "var(--error-soft)",
        border: `1px solid ${tone === "success" ? "var(--success)" : "var(--error)"}`,
        color: tone === "success" ? "var(--success)" : "var(--error)",
      }}
    >
      <Icon size={15} aria-hidden="true" />
      {message}
    </p>
  );
}

function StateBlock({ label, spinning }: { label: string; spinning?: boolean }) {
  return (
    <div
      className="flex min-h-64 flex-col items-center justify-center rounded-2xl px-6 text-center"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-soft)",
        color: "var(--foreground-muted)",
      }}
    >
      <LoaderCircle className={spinning ? "animate-spin" : undefined} size={28} aria-hidden="true" />
      <p className="mt-3 text-sm font-semibold">{label}</p>
    </div>
  );
}

function toForm(settings: AppSettings): SettingsUpdateRequest {
  return {
    downloadFolder: settings.downloadFolder,
    defaultQuality: settings.defaultQuality,
    defaultAudioFormat: settings.defaultAudioFormat,
    theme: settings.theme,
    filenameTemplate: settings.filenameTemplate,
    skipExisting: settings.skipExisting,
  };
}

function updateForm(
  setForm: Dispatch<SetStateAction<SettingsUpdateRequest | null>>,
  patch: SettingsUpdateRequest,
) {
  setForm((current) => ({ ...(current ?? {}), ...patch }));
}
