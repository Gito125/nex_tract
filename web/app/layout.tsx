import type { Metadata } from "next";
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
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
