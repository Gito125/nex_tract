"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Clock3,
  Download,
  FolderArchive,
  HelpCircle,
  Home,
  Settings,
  Bell,
  UserCircle,
  Layers,
} from "lucide-react";

import { BackendHealthCard } from "@/components/common/backend-health-card";

const navItems = [
  { label: "Home", icon: Home, href: "/" },
  { label: "Queue", icon: Download, href: null },
  { label: "History", icon: Clock3, href: "/history" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      {/* ── Desktop sidebar ───────────────────────────────────── */}
      <aside
        className="fixed inset-y-0 left-0 hidden lg:flex lg:flex-col"
        style={{
          width: "260px",
          background: "var(--sidebar-bg)",
          borderRight: "1px solid var(--sidebar-border)",
        }}
      >
        {/* Logo */}
        <div style={{ padding: "32px 20px 24px" }}>
          <Link href="/" className="flex items-center gap-3 group" style={{ textDecoration: "none" }}>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "var(--primary)",
                boxShadow: "0 4px 14px var(--primary-glow)",
                flexShrink: 0,
              }}
            >
              <Layers size={18} color="#fff" aria-hidden="true" />
            </span>
            <div>
              <p
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "18px",
                  fontWeight: 700,
                  color: "var(--sidebar-text)",
                  letterSpacing: "-0.03em",
                  lineHeight: 1.2,
                }}
              >
                Nextract
              </p>
              <p
                style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  color: "var(--sidebar-muted)",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  marginTop: "1px",
                }}
              >
                Personal Archive
              </p>
            </div>
          </Link>
        </div>

        {/* Divider */}
        <div style={{ height: "1px", background: "var(--sidebar-border)", margin: "0 20px" }} />

        {/* Nav label */}
        <p
          style={{
            fontSize: "10px",
            fontWeight: 600,
            color: "var(--sidebar-muted)",
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            padding: "20px 24px 8px",
          }}
        >
          Navigation
        </p>

        {/* Nav items */}
        <nav
          aria-label="Primary navigation"
          style={{ flex: 1, padding: "0 12px", display: "flex", flexDirection: "column", gap: "2px" }}
        >
          {navItems.map((item) => (
            <DesktopNavButton
              isActive={isActivePath(pathname, item.href)}
              item={item}
              key={item.label}
            />
          ))}
        </nav>

        {/* Bottom section */}
        <div style={{ padding: "0 12px 24px", display: "flex", flexDirection: "column", gap: "2px" }}>
          <div style={{ padding: "12px", marginBottom: "8px" }}>
            <BackendHealthCard />
          </div>
          <div style={{ height: "1px", background: "var(--sidebar-border)", margin: "0 12px 8px" }} />
          <SidebarFooterBtn icon={HelpCircle} label="Help & Support" />
          <SidebarFooterBtn icon={UserCircle} label="Account" danger={false} />
        </div>
      </aside>

      {/* ── Mobile header ─────────────────────────────────────── */}
      <header
        className="sticky top-0 z-20 lg:hidden"
        style={{
          background: "var(--sidebar-bg)",
          borderBottom: "1px solid var(--sidebar-border)",
          height: "60px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
        }}
      >
        <Link href="/" className="flex items-center gap-2.5" style={{ textDecoration: "none" }}>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "30px",
              height: "30px",
              borderRadius: "8px",
              background: "var(--primary)",
              flexShrink: 0,
            }}
          >
            <Layers size={14} color="#fff" aria-hidden="true" />
          </span>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "17px",
              fontWeight: 700,
              color: "var(--sidebar-text)",
              letterSpacing: "-0.03em",
            }}
          >
            Nextract
          </span>
        </Link>
        <div className="flex items-center gap-3" style={{ color: "var(--sidebar-muted)" }}>
          <button
            type="button"
            aria-label="Notifications"
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--sidebar-muted)", display: "flex" }}
          >
            <Bell size={19} />
          </button>
          <button
            type="button"
            aria-label="Account"
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--sidebar-muted)", display: "flex" }}
          >
            <UserCircle size={22} />
          </button>
        </div>
      </header>

      {/* ── Main content ──────────────────────────────────────── */}
      <main style={{ paddingLeft: "260px", paddingBottom: "0" }} className="lg:pl-[260px] pl-0 pb-24 lg:pb-0">
        {children}
      </main>

      {/* ── Mobile bottom nav ─────────────────────────────────── */}
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-20 lg:hidden"
        style={{
          background: "var(--sidebar-bg)",
          borderTop: "1px solid var(--sidebar-border)",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          padding: "8px 4px 12px",
        }}
      >
        {navItems.map((item) => (
          <MobileNavButton
            isActive={isActivePath(pathname, item.href)}
            item={item}
            key={item.label}
          />
        ))}
      </nav>
    </div>
  );
}

function DesktopNavButton({
  isActive,
  item,
}: {
  isActive: boolean;
  item: (typeof navItems)[number];
}) {
  const Icon = item.icon;

  const baseStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 12px",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: 500,
    textDecoration: "none",
    transition: "all 0.15s",
    border: "none",
    cursor: item.href ? "pointer" : "not-allowed",
    width: "100%",
    textAlign: "left",
    position: "relative",
    background: isActive ? "var(--sidebar-active-bg)" : "transparent",
    color: isActive ? "var(--sidebar-active-text)" : "var(--sidebar-muted)",
    opacity: !item.href ? 0.55 : 1,
  };

  const content = (
    <>
      <Icon size={17} aria-hidden="true" style={{ flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{item.label}</span>
      {!item.href && (
        <span
          style={{
            fontSize: "9px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "2px 6px",
            borderRadius: "4px",
            background: "var(--sidebar-hover)",
            color: "var(--sidebar-muted)",
          }}
        >
          Soon
        </span>
      )}
    </>
  );

  if (!item.href) {
    return (
      <button aria-disabled="true" style={baseStyle} type="button">
        {content}
      </button>
    );
  }

  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      href={item.href}
      style={baseStyle}
      onMouseEnter={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLAnchorElement).style.background = "var(--sidebar-hover)";
          (e.currentTarget as HTMLAnchorElement).style.color = "var(--sidebar-text)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
          (e.currentTarget as HTMLAnchorElement).style.color = "var(--sidebar-muted)";
        }
      }}
    >
      {content}
    </Link>
  );
}

function MobileNavButton({
  isActive,
  item,
}: {
  isActive: boolean;
  item: (typeof navItems)[number];
}) {
  const Icon = item.icon;

  const style: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px",
    padding: "6px 4px",
    borderRadius: "10px",
    fontSize: "10px",
    fontWeight: 600,
    textDecoration: "none",
    border: "none",
    cursor: item.href ? "pointer" : "not-allowed",
    background: "transparent",
    color: isActive ? "var(--sidebar-active-text)" : "var(--sidebar-muted)",
    opacity: !item.href ? 0.5 : 1,
    transition: "color 0.15s",
  };

  const content = (
    <>
      <Icon size={19} aria-hidden="true" />
      <span>{item.label}</span>
    </>
  );

  if (!item.href) {
    return (
      <button aria-disabled="true" style={style} type="button">
        {content}
      </button>
    );
  }

  return (
    <Link aria-current={isActive ? "page" : undefined} href={item.href} style={style}>
      {content}
    </Link>
  );
}

function SidebarFooterBtn({
  icon: Icon,
  label,
  danger,
}: {
  icon: React.ElementType;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "9px 12px",
        borderRadius: "10px",
        fontSize: "13px",
        fontWeight: 500,
        border: "none",
        background: "transparent",
        color: "var(--sidebar-muted)",
        cursor: "pointer",
        width: "100%",
        textAlign: "left",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "var(--sidebar-hover)";
        (e.currentTarget as HTMLButtonElement).style.color = "var(--sidebar-text)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
        (e.currentTarget as HTMLButtonElement).style.color = "var(--sidebar-muted)";
      }}
    >
      <Icon size={16} aria-hidden="true" />
      {label}
    </button>
  );
}

function isActivePath(pathname: string, href: string | null) {
  if (!href) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}