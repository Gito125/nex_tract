"use client";

import { FormEvent } from "react";
import { Link2, LoaderCircle, Search } from "lucide-react";

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
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(url);
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
            onChange={(event) => onUrlChange(event.target.value)}
            placeholder="Paste URL here..."
            disabled={isLoading}
            className="min-w-0 flex-1 bg-transparent text-base text-[var(--foreground)] outline-none placeholder:text-[var(--foreground-soft)] sm:text-lg"
          />
        </div>
        <button
          className="flex min-h-16 items-center justify-center gap-3 rounded-xl bg-[var(--primary)] px-8 text-base font-bold text-white shadow-[var(--shadow-soft)] transition hover:bg-[var(--primary-strong)] active:scale-[0.98] disabled:cursor-wait disabled:opacity-80 sm:min-w-52"
          disabled={isLoading}
          type="submit"
        >
          {isLoading ? (
            <LoaderCircle className="animate-spin" size={24} aria-hidden="true" />
          ) : (
            <Search size={24} aria-hidden="true" />
          )}
          {isLoading ? "Analyzing" : "Analyze Link"}
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
