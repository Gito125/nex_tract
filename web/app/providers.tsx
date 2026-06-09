"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { getSettings } from "@/lib/api";
import type { ThemeValue } from "@/lib/types";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 30_000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeSync />
      {children}
    </QueryClientProvider>
  );
}

function ThemeSync() {
  useEffect(() => {
    let isMounted = true;

    getSettings()
      .then((settings) => {
        if (isMounted) applyTheme(settings.theme);
      })
      .catch(() => {
        if (isMounted) applyTheme("system");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return null;
}

export function applyTheme(theme: ThemeValue) {
  const root = document.documentElement;

  if (theme === "system") {
    root.removeAttribute("data-theme");
    return;
  }

  root.dataset.theme = theme;
}
