import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nextract",
  description: "Local-first media extraction and downloading app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (() => {
                try {
                  const stored = window.localStorage.getItem("nextract-theme") || "system";
                  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                  document.documentElement.dataset.theme =
                    stored === "light" || stored === "dark"
                      ? stored
                      : systemDark ? "dark" : "light";
                } catch {
                  document.documentElement.dataset.theme = "light";
                }
              })();
            `,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
