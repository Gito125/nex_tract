"use client";

import { FormEvent, useState } from "react";
import { Link2, LoaderCircle, Search } from "lucide-react";

export function UrlInputCard() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const value = url.trim();

    if (!value) {
      setError("Paste a YouTube URL to analyze.");
      return;
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(value);
    } catch {
      setError("Use a complete URL, for example https://youtube.com/watch?v=...");
      return;
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      setError("Only web links are supported.");
      return;
    }

    setIsChecking(true);
    window.setTimeout(() => {
      setIsChecking(false);
      setError("Analysis is coming in Phase 2. Backend health is available now.");
    }, 350);
  }

  return (
    <form
      className="mx-auto w-full max-w-4xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-lift)] sm:p-3"
      onSubmit={handleSubmit}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <label htmlFor="media-url" className="sr-only">
          Paste YouTube URL
        </label>
        <div className="flex min-h-16 flex-1 items-center gap-3 rounded-xl bg-[var(--surface-muted)] px-5 text-[var(--foreground-muted)]">
          <Link2 size={23} aria-hidden="true" />
          <input
            id="media-url"
            type="url"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              if (error) {
                setError(null);
              }
            }}
            placeholder="Paste URL here..."
            className="min-w-0 flex-1 bg-transparent text-base text-[var(--foreground)] outline-none placeholder:text-[var(--foreground-soft)] sm:text-lg"
          />
        </div>
        <button
          className="flex min-h-16 items-center justify-center gap-3 rounded-xl bg-[var(--primary)] px-8 text-base font-bold text-white shadow-[var(--shadow-soft)] transition hover:bg-[var(--primary-strong)] active:scale-[0.98] disabled:cursor-wait disabled:opacity-80 sm:min-w-52"
          disabled={isChecking}
          type="submit"
        >
          {isChecking ? (
            <LoaderCircle className="animate-spin" size={24} aria-hidden="true" />
          ) : (
            <Search size={24} aria-hidden="true" />
          )}
          Analyze Link
        </button>
      </div>

      {error ? (
        <p className="mt-3 px-1 text-sm font-medium text-[var(--error)]" role="status">
          {error}
        </p>
      ) : null}
    </form>
  );
}
