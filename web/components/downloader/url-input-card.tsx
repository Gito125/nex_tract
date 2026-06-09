"use client";

import { FormEvent, useRef, useState } from "react";
import { Link2, LoaderCircle, Zap } from "lucide-react";

export function UrlInputCard({
  error,
  isLoading,
  onSubmit,
  onUrlChange,
  url,
}: {
  error: string | null;
  isLoading: boolean;
  onSubmit: (url: string) => void;
  onUrlChange: (url: string) => void;
  url: string;
}) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(url);
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      <form
        onSubmit={handleSubmit}
        className="relative rounded-2xl transition-all duration-300"
        style={{
          background: "var(--surface)",
          border: focused
            ? "1px solid var(--primary)"
            : "1px solid var(--border-strong)",
          boxShadow: focused
            ? "0 0 0 4px var(--primary-glow), var(--shadow-lift)"
            : "var(--shadow-soft)",
        }}
      >
        <div className="flex items-center gap-0">
          {/* Input area */}
          <label htmlFor="media-url" className="sr-only">
            Paste YouTube URL
          </label>
          <div className="flex flex-1 items-center gap-3 px-5 py-4">
            <Link2
              size={18}
              aria-hidden="true"
              style={{
                color: focused ? "var(--primary-strong)" : "var(--foreground-soft)",
                flexShrink: 0,
                transition: "color 0.2s",
              }}
            />
            <input
              id="media-url"
              ref={inputRef}
              type="url"
              value={url}
              onChange={(e) => onUrlChange(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Paste a YouTube URL…"
              disabled={isLoading}
              className="min-w-0 flex-1 bg-transparent text-base outline-none"
              style={{
                color: "var(--foreground)",
                caretColor: "var(--primary)",
              }}
            />
          </div>

          {/* Divider */}
          <div
            style={{
              width: "1px",
              height: "44px",
              background: "var(--border)",
              flexShrink: 0,
            }}
            aria-hidden="true"
          />

          {/* Submit button */}
          <div className="p-2">
            <button
              className="flex items-center gap-2.5 rounded-xl px-5 font-bold text-sm transition-all duration-200 active:scale-95"
              disabled={isLoading}
              type="submit"
              style={{
                background: isLoading ? "var(--primary-dim)" : "var(--primary)",
                color: "#fff",
                height: "44px",
                paddingLeft: "20px",
                paddingRight: "20px",
                cursor: isLoading ? "wait" : "pointer",
                opacity: isLoading ? 0.8 : 1,
                boxShadow: isLoading ? "none" : "0 4px 20px var(--primary-glow)",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--primary-strong)";
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = isLoading ? "var(--primary-dim)" : "var(--primary)";
              }}
            >
              {isLoading ? (
                <LoaderCircle className="animate-spin" size={16} aria-hidden="true" />
              ) : (
                <Zap size={16} aria-hidden="true" />
              )}
              {isLoading ? "Analyzing" : "Analyze"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            className="mx-4 mb-3 flex items-center gap-2 rounded-lg px-3 py-2"
            style={{ background: "var(--error-soft)", border: "1px solid var(--error)30" }}
            role="alert"
          >
            <span
              style={{
                width: "5px",
                height: "5px",
                borderRadius: "50%",
                background: "var(--error)",
                flexShrink: 0,
              }}
              aria-hidden="true"
            />
            <p
              className="text-sm font-medium"
              style={{ color: "var(--error)" }}
            >
              {error}
            </p>
          </div>
        )}
      </form>
    </div>
  );
}