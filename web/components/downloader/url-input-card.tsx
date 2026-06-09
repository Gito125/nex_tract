"use client";

import { FormEvent, useRef, useState } from "react";
import { Clipboard, Link2, LoaderCircle, Search, X } from "lucide-react";

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
  const [utilityMessage, setUtilityMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasUrl = url.trim().length > 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(url);
  }

  async function handleUtilityClick() {
    if (isLoading) return;
    if (hasUrl) {
      onUrlChange("");
      setUtilityMessage("Input cleared.");
      inputRef.current?.focus();
      return;
    }
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        onUrlChange(text);
        setUtilityMessage("Link pasted from clipboard.");
      } else {
        setUtilityMessage("Clipboard is empty.");
      }
    } catch {
      setUtilityMessage("Clipboard access was blocked.");
    } finally {
      inputRef.current?.focus();
    }
  }

  return (
    <div style={{ width: "100%" }}>
      {/* Input wrapper */}
      <form
        onSubmit={handleSubmit}
        style={{
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          background: "var(--surface)",
          border: focused
            ? "1px solid var(--primary)"
            : error
            ? "1px solid var(--error)"
            : "1px solid var(--border-strong)",
          boxShadow: focused
            ? "0 0 0 4px var(--primary-glow), var(--shadow-lift)"
            : error
            ? "0 0 0 3px var(--error-border)"
            : "var(--shadow-soft)",
          transition: "all 0.2s var(--ease-out)",
        }}
      >
        <div className="url-input-form-row">
          {/* Left icon */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              paddingLeft: "20px",
              paddingRight: "4px",
              flexShrink: 0,
            }}
          >
            <Link2
              size={17}
              style={{
                color: focused ? "var(--primary)" : "var(--foreground-subtle)",
                transition: "color 0.2s",
              }}
              aria-hidden="true"
            />
          </div>

          {/* Input */}
          <label htmlFor="media-url" className="sr-only">Paste YouTube URL</label>
          <input
            id="media-url"
            className="url-input-main"
            ref={inputRef}
            type="url"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Paste a YouTube URL…"
            disabled={isLoading}
            autoComplete="off"
            style={{
              flex: 1,
              minWidth: 0,
              height: "64px",
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: "16px",
              fontFamily: "var(--font-body)",
              color: "var(--foreground)",
              padding: "0 16px",
              caretColor: "var(--primary)",
            }}
          />

          {/* Utility button */}
          <button
            aria-label={hasUrl ? "Clear input" : "Paste from clipboard"}
            className="url-input-utility"
            type="button"
            disabled={isLoading}
            onClick={handleUtilityClick}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              minWidth: "48px",
              padding: "0 14px",
              background: "none",
              border: "none",
              borderLeft: "1px solid var(--border-soft)",
              cursor: isLoading ? "wait" : "pointer",
              color: "var(--foreground-soft)",
              fontSize: "12px",
              fontWeight: 600,
              fontFamily: "var(--font-body)",
              flexShrink: 0,
              transition: "color 0.15s",
              opacity: isLoading ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--foreground)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--foreground-soft)";
            }}
          >
            {hasUrl ? (
              <X size={13} aria-hidden="true" />
            ) : (
              <Clipboard size={13} aria-hidden="true" />
            )}
            <span className="hidden sm:inline">{hasUrl ? "Clear" : "Paste"}</span>
          </button>

          {/* Divider */}
          <div className="url-input-divider" style={{ width: "1px", background: "var(--border-soft)", margin: "10px 0", flexShrink: 0 }} aria-hidden="true" />

          {/* Analyze button */}
          <div className="url-input-action-wrap">
            <button
              className="url-input-submit"
              type="submit"
              disabled={isLoading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                height: "48px",
                padding: "0 24px",
                borderRadius: "var(--radius-md)",
                border: "none",
                background: isLoading ? "var(--primary-dim)" : "var(--primary)",
                color: "var(--on-primary)",
                fontSize: "14px",
                fontWeight: 700,
                fontFamily: "var(--font-body)",
                cursor: isLoading ? "wait" : "pointer",
                whiteSpace: "nowrap",
                boxShadow: isLoading ? "none" : "0 2px 10px var(--primary-glow)",
                transition: "all 0.2s var(--ease-out)",
                letterSpacing: "0",
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--primary-strong)";
                  (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = isLoading
                  ? "var(--primary-dim)"
                  : "var(--primary)";
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
              }}
            >
              {isLoading ? (
                <LoaderCircle className="animate-spin" size={14} aria-hidden="true" />
              ) : (
                <Search size={14} aria-hidden="true" />
              )}
              {isLoading ? "Analyzing…" : "Analyze"}
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div
            role="alert"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px 12px",
              borderTop: "1px solid var(--border-soft)",
              background: "var(--error-soft)",
            }}
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
            <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--error)" }}>{error}</p>
          </div>
        )}
      </form>
      {utilityMessage && !error && (
        <p
          aria-live="polite"
          className="animate-fade-in"
          style={{
            marginTop: "8px",
            fontSize: "12px",
            fontWeight: 600,
            color: "var(--foreground-soft)",
            textAlign: "left",
          }}
        >
          {utilityMessage}
        </p>
      )}
    </div>
  );
}
