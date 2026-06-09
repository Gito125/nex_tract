import {
  Bell,
  CircleHelp,
  Clock3,
  Download,
  Home,
  LogOut,
  Settings,
  UserCircle,
} from "lucide-react";

import { BackendHealthCard } from "@/components/common/backend-health-card";

const navItems = [
  { label: "Home", icon: Home, active: true },
  { label: "Queue", icon: Download, active: false },
  { label: "History", icon: Clock3, active: false },
  { label: "Settings", icon: Settings, active: false },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <aside className="fixed inset-y-0 left-0 hidden w-80 border-r border-[var(--border-soft)] bg-[var(--surface-muted)] px-5 py-7 lg:flex lg:flex-col">
        <div>
          <p className="text-3xl font-bold tracking-tight text-[var(--primary)]">
            Nextract
          </p>
          <p className="mt-2 text-base font-medium text-[var(--foreground-muted)]">
            Personal Archive
          </p>
        </div>

        <nav aria-label="Primary navigation" className="mt-12 flex flex-col gap-3">
          {navItems.map((item) => (
            <NavButton key={item.label} item={item} variant="desktop" />
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-5 border-t border-[var(--border)] pt-5">
          <BackendHealthCard />
          <div className="flex flex-col gap-3 text-[var(--foreground)]">
            <button className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-left text-sm font-medium transition hover:bg-[var(--surface-strong)]">
              <CircleHelp size={21} aria-hidden="true" />
              Help
            </button>
            <button className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-left text-sm font-medium transition hover:bg-[var(--surface-strong)]">
              <LogOut size={21} aria-hidden="true" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex min-h-20 items-center justify-between border-b border-[var(--border-soft)] bg-[var(--surface)] px-6 shadow-[var(--shadow-soft)] lg:hidden">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]">
            <Download size={20} aria-hidden="true" />
          </span>
          <span className="text-3xl font-bold tracking-tight text-[var(--primary)]">
            Nextract
          </span>
        </div>
        <div className="flex items-center gap-4 text-[var(--foreground-muted)]">
          <Bell size={24} aria-hidden="true" />
          <UserCircle size={28} aria-hidden="true" />
        </div>
      </header>

      <main className="pb-28 lg:ml-80 lg:pb-0">{children}</main>

      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-[var(--border-soft)] bg-[var(--surface)] px-3 py-3 shadow-[0_-8px_24px_rgba(25,28,29,0.08)] lg:hidden"
      >
        {navItems.map((item) => (
          <NavButton key={item.label} item={item} variant="mobile" />
        ))}
      </nav>
    </div>
  );
}

function NavButton({
  item,
  variant,
}: {
  item: (typeof navItems)[number];
  variant: "desktop" | "mobile";
}) {
  const Icon = item.icon;

  if (variant === "mobile") {
    return (
      <button
        aria-current={item.active ? "page" : undefined}
        aria-disabled={!item.active}
        className={`mx-auto flex min-h-14 w-full max-w-24 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-semibold transition ${
          item.active
            ? "bg-[var(--primary-soft)] text-[var(--primary)]"
            : "text-[var(--foreground-muted)]"
        }`}
        type="button"
      >
        <Icon size={23} aria-hidden="true" />
        {item.label}
      </button>
    );
  }

  return (
    <button
      aria-current={item.active ? "page" : undefined}
      aria-disabled={!item.active}
      className={`flex min-h-15 items-center gap-4 rounded-lg px-5 text-left text-base font-semibold transition ${
        item.active
          ? "bg-[var(--primary)] text-white shadow-[var(--shadow-soft)]"
          : "text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
      }`}
      type="button"
    >
      <Icon size={23} aria-hidden="true" />
      {item.label}
    </button>
  );
}
