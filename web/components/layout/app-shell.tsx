"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Clock3,
  ChevronsLeft,
  ChevronsRight,
  Download,
  HelpCircle,
  Home,
  Layers,
  Settings,
} from "lucide-react";

import { BackendHealthCard } from "@/components/common/backend-health-card";

const navItems = [
  { label: "Home", icon: Home, href: "/" },
  { label: "Queue", icon: Download, href: "/queue" },
  { label: "History", icon: Clock3, href: "/history" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div
      className="app-shell"
      data-sidebar={isCollapsed ? "collapsed" : "expanded"}
      style={{ background: "var(--background)", color: "var(--foreground)" }}
    >
      {/* ── Desktop sidebar ───────────────────────────────────── */}
      <aside
        className="app-shell__sidebar"
        style={{
          background: "var(--sidebar-bg)",
          borderRight: "1px solid var(--sidebar-border)",
        }}
      >
        {/* Logo */}
        <div className="app-shell__brand">
          <Link
            aria-label="Nextract home"
            className="app-shell__brand-link"
            href="/"
            style={{ textDecoration: "none" }}
            title={isCollapsed ? "Nextract" : undefined}
          >
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
              <Layers size={18} color="var(--on-primary)" aria-hidden="true" />
            </span>
            <div className="app-shell__brand-text">
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
          <button
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="app-shell__collapse-btn"
            onClick={() => setIsCollapsed((value) => !value)}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            type="button"
          >
            {isCollapsed ? (
              <ChevronsRight size={16} aria-hidden="true" />
            ) : (
              <ChevronsLeft size={16} aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Divider */}
        <div className="app-shell__divider" />

        {/* Nav label */}
        <p
          className="app-shell__section-label"
          style={{
            fontSize: "10px",
            fontWeight: 600,
            color: "var(--sidebar-muted)",
            letterSpacing: "0.10em",
            textTransform: "uppercase",
          }}
        >
          Navigation
        </p>

        {/* Nav items */}
        <nav
          aria-label="Primary navigation"
          className="app-shell__nav"
        >
          {navItems.map((item) => (
            <DesktopNavButton
              isCollapsed={isCollapsed}
              isActive={isActivePath(pathname, item.href)}
              item={item}
              key={item.label}
            />
          ))}
        </nav>

        {/* Bottom section */}
        <div className="app-shell__sidebar-bottom">
          <div className="app-shell__health">
            <BackendHealthCard />
          </div>
          <div className="app-shell__divider app-shell__divider--bottom" />
          <SidebarFooterBtn icon={HelpCircle} isCollapsed={isCollapsed} label="Help coming soon" />
        </div>
      </aside>

      {/* ── Mobile header ─────────────────────────────────────── */}
      <header
        className="app-shell__mobile-header"
        style={{
          background: "var(--sidebar-bg)",
          borderBottom: "1px solid var(--sidebar-border)",
        }}
      >
        <Link href="/" className="app-shell__mobile-brand" style={{ textDecoration: "none" }}>
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
            <Layers size={14} color="var(--on-primary)" aria-hidden="true" />
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
      </header>

      {/* ── Main content ──────────────────────────────────────── */}
      <main className="app-shell__main">
        {children}
      </main>

      {/* ── Mobile bottom nav ─────────────────────────────────── */}
      <nav
        aria-label="Mobile navigation"
        className="app-shell__mobile-nav"
        style={{
          background: "var(--sidebar-bg)",
          borderTop: "1px solid var(--sidebar-border)",
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
  isCollapsed,
  isActive,
  item,
}: {
  isCollapsed: boolean;
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
    minHeight: "44px",
  };

  const content = (
    <>
      <Icon size={17} aria-hidden="true" style={{ flexShrink: 0 }} />
      <span className="app-shell__nav-label" style={{ flex: 1 }}>{item.label}</span>
      {!item.href && (
        <span
          className="app-shell__soon-badge"
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
      <button
        aria-disabled="true"
        aria-label={item.label}
        disabled
        style={baseStyle}
        title={isCollapsed ? `${item.label} coming soon` : undefined}
        type="button"
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      aria-label={item.label}
      href={item.href}
      style={baseStyle}
      title={isCollapsed ? item.label : undefined}
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
    minHeight: "44px",
  };

  const content = (
    <>
      <Icon size={19} aria-hidden="true" />
      <span>{item.label}</span>
    </>
  );

  if (!item.href) {
    return (
      <button aria-disabled="true" disabled style={style} type="button">
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
  isCollapsed,
  label,
}: {
  icon: React.ElementType;
  isCollapsed: boolean;
  label: string;
}) {
  return (
    <button
      aria-disabled="true"
      aria-label={label}
      className="app-shell__footer-btn"
      disabled
      title={isCollapsed ? label : undefined}
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
        cursor: "not-allowed",
        width: "100%",
        textAlign: "left",
        transition: "all 0.15s",
        minHeight: "44px",
        opacity: 0.58,
      }}
    >
      <Icon size={16} aria-hidden="true" />
      <span className="app-shell__footer-label">{label}</span>
    </button>
  );
}

function isActivePath(pathname: string, href: string | null) {
  if (!href) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
