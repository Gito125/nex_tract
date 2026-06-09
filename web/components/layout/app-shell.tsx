"use client";

import {
  Clock3,
  Download,
  FolderArchive,
  HelpCircle,
  Home,
  LogOut,
  Settings,
  Bell,
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
    <div
      className="min-h-screen"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      {/* Desktop sidebar */}
      <aside
        className="fixed inset-y-0 left-0 hidden w-72 lg:flex lg:flex-col"
        style={{
          background: "var(--surface)",
          borderRight: "1px solid var(--border)",
        }}
      >
        {/* Logo */}
        <div className="px-6 pt-8 pb-6">
          <div className="flex items-center gap-3">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{
                background: "var(--primary-soft)",
                border: "1px solid var(--border-primary)",
              }}
            >
              <FolderArchive
                size={18}
                style={{ color: "var(--primary-strong)" }}
                aria-hidden="true"
              />
            </span>
            <div>
              <p
                className="text-xl font-bold tracking-tight"
                style={{ fontFamily: "'Space Grotesk', sans-serif", color: "var(--foreground)" }}
              >
                Nextract
              </p>
              <p className="text-xs font-medium" style={{ color: "var(--foreground-soft)" }}>
                Personal Archive
              </p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: "1px", background: "var(--border-soft)", margin: "0 24px" }} />

        {/* Nav */}
        <nav aria-label="Primary navigation" className="mt-6 flex flex-col gap-1 px-3">
          {navItems.map((item) => (
            <DesktopNavButton key={item.label} item={item} />
          ))}
        </nav>

        {/* Bottom */}
        <div className="mt-auto px-3 pb-6 flex flex-col gap-3">
          <div className="px-3 pb-3">
            <BackendHealthCard />
          </div>
          <div
            style={{
              height: "1px",
              background: "var(--border-soft)",
              margin: "0 12px 12px",
            }}
          />
          <button
            className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors"
            style={{ color: "var(--foreground-muted)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-hover)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--foreground)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--foreground-muted)";
            }}
            type="button"
          >
            <HelpCircle size={18} aria-hidden="true" />
            Help & Support
          </button>
          <button
            className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors"
            style={{ color: "var(--foreground-muted)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "var(--error-soft)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--error)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--foreground-muted)";
            }}
            type="button"
          >
            <LogOut size={18} aria-hidden="true" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <header
        className="sticky top-0 z-20 flex min-h-16 items-center justify-between px-5 lg:hidden"
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          boxShadow: "var(--shadow-soft)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: "var(--primary-soft)", border: "1px solid var(--border-primary)" }}
          >
            <FolderArchive size={16} style={{ color: "var(--primary-strong)" }} aria-hidden="true" />
          </span>
          <span
            className="text-lg font-bold tracking-tight"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: "var(--foreground)" }}
          >
            Nextract
          </span>
        </div>
        <div className="flex items-center gap-3" style={{ color: "var(--foreground-muted)" }}>
          <button type="button" aria-label="Notifications">
            <Bell size={20} aria-hidden="true" />
          </button>
          <button type="button" aria-label="Account">
            <UserCircle size={24} aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="pb-24 lg:ml-72 lg:pb-0">{children}</main>

      {/* Mobile bottom nav */}
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 px-2 py-2 lg:hidden"
        style={{
          background: "var(--surface)",
          borderTop: "1px solid var(--border)",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.4)",
        }}
      >
        {navItems.map((item) => (
          <MobileNavButton key={item.label} item={item} />
        ))}
      </nav>
    </div>
  );
}

function DesktopNavButton({ item }: { item: (typeof navItems)[number] }) {
  const Icon = item.icon;

  return (
    <button
      aria-current={item.active ? "page" : undefined}
      aria-disabled={!item.active}
      className="relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold transition-all"
      style={{
        background: item.active ? "var(--primary-soft)" : "transparent",
        color: item.active ? "var(--primary-strong)" : "var(--foreground-muted)",
        border: item.active ? "1px solid var(--border-primary)" : "1px solid transparent",
      }}
      type="button"
    >
      {/* Amber tape marker — the signature element */}
      {item.active && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 0,
            top: "50%",
            transform: "translateY(-50%)",
            width: "3px",
            height: "60%",
            borderRadius: "0 2px 2px 0",
            background: "var(--accent)",
            boxShadow: "0 0 8px var(--accent)",
          }}
        />
      )}
      <Icon size={18} aria-hidden="true" />
      {item.label}
      {!item.active && (
        <span
          className="ml-auto text-xs font-bold uppercase tracking-wider rounded px-1.5 py-0.5"
          style={{
            background: "var(--surface-strong)",
            color: "var(--foreground-subtle)",
            fontSize: "9px",
            letterSpacing: "0.1em",
          }}
        >
          Soon
        </span>
      )}
    </button>
  );
}

function MobileNavButton({ item }: { item: (typeof navItems)[number] }) {
  const Icon = item.icon;
  return (
    <button
      aria-current={item.active ? "page" : undefined}
      aria-disabled={!item.active}
      className="flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-xs font-semibold transition-all"
      style={{
        color: item.active ? "var(--primary-strong)" : "var(--foreground-muted)",
        background: item.active ? "var(--primary-muted)" : "transparent",
        position: "relative",
      }}
      type="button"
    >
      {item.active && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "20px",
            height: "2px",
            borderRadius: "0 0 2px 2px",
            background: "var(--accent)",
            boxShadow: "0 0 6px var(--accent)",
          }}
        />
      )}
      <Icon size={20} aria-hidden="true" />
      {item.label}
    </button>
  );
}