"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Clock3,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Home,
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
            <img
              src="/icon.png"
              alt="Nextract Logo"
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                objectFit: "contain",
                flexShrink: 0,
              }}
            />
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
          <CreatorProfileBtn isCollapsed={isCollapsed} />
        </div>
      </aside>
      

      {/* ── Mobile header ─────────────────────────────────────── */}
      <header
        className="app-shell__mobile-header"
        style={{
          background: "var(--sidebar-bg)",
          borderBottom: "1px solid var(--sidebar-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        <Link href="/" className="app-shell__mobile-brand flex lg:hidden items-center gap-3" style={{ textDecoration: "none" }}>
          <img
            src="/icon.png"
            alt="Nextract Logo"
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "8px",
              objectFit: "contain",
              flexShrink: 0,
            }}
          />
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
        <a
          href="https://github.com/Gito125"
          target="_blank"
          rel="noopener noreferrer"
          className="sm:flex lg:hidden items-center justify-center text-2xl" // Show on small and medium screens, hidden on larger screens
          title="Built with ❤️ by Ogwang Gift Gideon"
        >
          <CreatorAvatar size={30} />
        </a>
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

type AvatarVariant = "indigo" | "teal" | "slate";

const VARIANT_STYLES: Record<AvatarVariant, React.CSSProperties> = {
  indigo: {
    background: "oklch(0.18 0.035 268)",
    border: "1px solid oklch(0.38 0.12 268 / 0.6)",
    color: "oklch(0.78 0.12 268)",
  },
  teal: {
    background: "oklch(0.18 0.04 185)",
    border: "1px solid oklch(0.42 0.14 185 / 0.55)",
    color: "oklch(0.75 0.13 185)",
  },
  slate: {
    background: "oklch(0.22 0.008 260)",
    border: "1px solid oklch(0.38 0.02 260 / 0.5)",
    color: "oklch(0.72 0.02 260)",
  },
};

const RING_STYLES: Record<AvatarVariant, string> = {
  indigo:
    "conic-gradient(from 200deg, oklch(0.55 0.25 268) 0%, oklch(0.70 0.18 200) 40%, oklch(0.55 0.25 268) 100%)",
  teal: "conic-gradient(from 200deg, oklch(0.50 0.22 185) 0%, oklch(0.68 0.16 220) 40%, oklch(0.50 0.22 185) 100%)",
  slate: "conic-gradient(from 200deg, oklch(0.45 0.04 260) 0%, oklch(0.60 0.03 260) 40%, oklch(0.45 0.04 260) 100%)",
};

function CreatorAvatar({
  size = 28,
  username = "Gito125",
  initials = "O.G",
  variant = "indigo",
}: {
  size?: number;
  username?: string;
  initials?: string;
  variant?: AvatarVariant;
}) {
  const [imgError, setImgError] = useState(false);
  const avatarUrl = `https://github.com/${username}.png`;
  const fontSize = Math.round(size * 0.33);

  if (imgError) {
    return (
      <span
        style={{
          position: "relative",
          display: "inline-flex",
          flexShrink: 0,
        }}
        aria-label={`${username} avatar`}
        role="img"
      >
        {/* conic ring */}
        <span
          style={{
            position: "absolute",
            inset: "-2px",
            borderRadius: "50%",
            background: RING_STYLES[variant],
            opacity: variant === "slate" ? 0.35 : 0.45,
            zIndex: 0,
          }}
        />
        {/* initials */}
        <span
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: "50%",
            flexShrink: 0,
            userSelect: "none",
            fontFamily: "'Geist Mono', 'JetBrains Mono', ui-monospace, monospace",
            fontWeight: 500,
            fontSize: `${fontSize}px`,
            letterSpacing: "-0.01em",
            ...VARIANT_STYLES[variant],
          }}
        >
          {initials}
        </span>
      </span>
    );
  }

  return (
    <img
      src={avatarUrl}
      alt={`${username} avatar`}
      onError={() => setImgError(true)}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        objectFit: "cover",
        flexShrink: 0,
        border: "1px solid var(--sidebar-border)",
        display: "block",
      }}
    />
  );
}

function CreatorProfileBtn({
  isCollapsed,
}: {
  isCollapsed: boolean;
}) {
  return (
    <a
      href="https://github.com/Gito125"
      target="_blank"
      rel="noopener noreferrer"
      className="app-shell__footer-btn"
      title={isCollapsed ? "Built with ❤️ by O. G. Gideon" : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "8px 12px",
        borderRadius: "10px",
        border: "none",
        background: "transparent",
        color: "var(--sidebar-muted)",
        cursor: "pointer",
        width: "100%",
        textDecoration: "none",
        textAlign: "left",
        transition: "all 0.15s",
        minHeight: "48px",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--sidebar-hover)";
        e.currentTarget.style.color = "var(--sidebar-text)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "var(--sidebar-muted)";
      }}
    >
      <CreatorAvatar size={28} />
      
      <div className="app-shell__footer-label" style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
        <span
          style={{
            fontSize: "13px",
            fontWeight: 600,
            lineHeight: 1.2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          O. G. Gideon
        </span>
        <span
          style={{
            fontSize: "11px",
            color: "var(--sidebar-muted)",
            marginTop: "1px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "flex",
            alignItems: "center",
            gap: "3px",
          }}
        >
          Built with <span style={{ color: "#ef4444" }}>❤️</span>
        </span>
      </div>
    </a>
  );
}

function isActivePath(pathname: string, href: string | null) {
  if (!href) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
