export default function Home() {
  return (
    <main className="min-h-screen bg-[#f8f9fa] px-4 py-8 text-[#191c1d] dark:bg-[#0f172a] dark:text-[#f0f1f2] sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-4 border-b border-[#c7c4d8] pb-6 dark:border-[#334155] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#3525cd] dark:text-[#c3c0ff]">
              Nextract
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Local-first media extraction
            </h1>
          </div>
          <div className="rounded-full bg-white px-4 py-2 text-sm font-medium text-[#464555] shadow-sm dark:bg-[#1e293b] dark:text-[#c3c0ff]">
            web/ Next.js
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="rounded-2xl bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.05)] dark:bg-[#1e293b]">
            <label
              htmlFor="media-url"
              className="text-sm font-semibold text-[#464555] dark:text-[#c3c0ff]"
            >
              Paste a media link
            </label>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <input
                id="media-url"
                type="url"
                placeholder="https://youtube.com/watch?v=..."
                className="min-h-16 flex-1 rounded-xl border border-[#c7c4d8] bg-[#f8f9fa] px-4 text-base outline-none transition focus:border-[#4f46e5] focus:ring-4 focus:ring-[#4f46e5]/20 dark:border-[#334155] dark:bg-[#0f172a]"
              />
              <button className="min-h-16 rounded-xl bg-[#3525cd] px-6 font-semibold text-white transition hover:bg-[#2f21b8]">
                Analyze
              </button>
            </div>
            <div className="mt-6 grid gap-3 text-sm text-[#464555] dark:text-[#c3c0ff] sm:grid-cols-3">
              <span>Analyze metadata</span>
              <span>Choose quality</span>
              <span>Save to downloads/</span>
            </div>
          </div>

          <aside className="rounded-2xl bg-[#1e293b] p-6 text-white shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
            <h2 className="text-lg font-semibold">Project layout</h2>
            <pre className="mt-4 overflow-auto rounded-xl bg-[#0f172a] p-4 text-sm leading-7 text-[#c3c0ff]">
{`nextract/
  web/        Next.js
  server/     FastAPI
  downloads/  saved files
  data/       SQLite`}
            </pre>
          </aside>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["web/", "Next.js app and UI"],
            ["server/", "FastAPI analysis and jobs"],
            ["downloads/", "Organized saved files"],
            ["data/", "SQLite local database"],
          ].map(([title, body]) => (
            <div
              key={title}
              className="rounded-xl border border-[#c7c4d8] bg-white p-5 dark:border-[#334155] dark:bg-[#1e293b]"
            >
              <h2 className="font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-[#464555] dark:text-[#c3c0ff]">
                {body}
              </p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
