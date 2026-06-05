"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { readStoredAuthSession } from "@/lib/auth-session";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/auth";
import { useLocale } from "../Locale/LocaleProvider";
import TransitionLink from "./TransitionLink";

type RoleState = UserRole | null;

type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
  aliases?: string[];
};

const CORE_ITEMS: NavItem[] = [
  { href: "/home", label: "总览", shortLabel: "总", aliases: ["/"] },
  { href: "/visualize", label: "指挥中心", shortLabel: "指" },
  {
    href: "/operations",
    label: "运行中台",
    shortLabel: "运",
    aliases: ["/monitor", "/digital-twin"],
  },
  {
    href: "/workspace",
    label: "智能工作区",
    shortLabel: "工",
    aliases: [
      "/data-hub",
      "/reports",
      "/training",
      "/annotation",
      "/platform-config",
      "/ai-assistant",
    ],
  },
];

const SHORTCUT_MAP: Record<string, string> = {
  "/home": "Alt+1",
  "/visualize": "Alt+2",
  "/operations": "Alt+3",
  "/workspace": "Alt+4",
  "/monitor": "Alt+5",
  "/admin": "Alt+6",
};

const ADMIN_ITEMS: NavItem[] = [
  {
    href: "/admin",
    label: "管理后台",
    shortLabel: "管",
    aliases: [
      "/admin/alerts",
      "/admin/data-import",
      "/admin/inspections",
      "/admin/storage",
      "/admin/wheels",
    ],
  },
];

function normalizeRole(role: RoleState) {
  return role === "user" ? "operator" : role;
}

function matchesRoute(currentPath: string, item: NavItem) {
  if (currentPath === item.href || currentPath.startsWith(`${item.href}/`)) {
    return true;
  }

  return (
    item.aliases?.some(
      (alias) => currentPath === alias || currentPath.startsWith(`${alias}/`),
    ) ?? false
  );
}

function NavIcon({ href }: { href: string }) {
  const iconClass = "h-4 w-4 shrink-0";

  switch (href) {
    case "/home":
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case "/visualize":
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      );
    case "/operations":
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
    case "/workspace":
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      );
    case "/admin":
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    default:
      return null;
  }
}

interface NavigationProps {
  collapsed?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  renderDesktop?: boolean;
  renderMobileDrawer?: boolean;
}

export default function Navigation({
  collapsed = false,
  mobileOpen,
  onMobileClose,
  renderDesktop = true,
  renderMobileDrawer = true,
}: NavigationProps) {
  const pathname = usePathname();
  const { t } = useLocale();
  const currentPath = pathname === "/" ? "/home" : pathname;
  const [role, setRole] = useState<RoleState>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncRole = () => {
      const session = readStoredAuthSession();
      setRole(session?.role ?? null);
    };

    syncRole();
    window.addEventListener("storage", syncRole);
    window.addEventListener("app:role-change", syncRole as EventListener);

    return () => {
      window.removeEventListener("storage", syncRole);
      window.removeEventListener("app:role-change", syncRole as EventListener);
    };
  }, []);

  const navItems = useMemo(() => {
    const normalizedRole = normalizeRole(role);

    if (normalizedRole === "admin") {
      return [...CORE_ITEMS, ...ADMIN_ITEMS];
    }

    if (normalizedRole === "engineer" || normalizedRole === "viewer") {
      return CORE_ITEMS.filter(
        (item) => item.href !== "/visualize" && item.href !== "/operations",
      );
    }

    return CORE_ITEMS;
  }, [role]);

  const desktopNavItemClass = (isActive: boolean) =>
    cn(
      "nav-pill group relative rounded-xl px-4 py-2 text-sm font-medium whitespace-nowrap shrink-0 transition-all duration-300",
      "hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2",
      isActive && [
        "nav-pill-active",
        "border border-[var(--accent)]/30",
        "bg-gradient-to-r from-[var(--accent)]/20 to-[var(--accent-strong)]/20",
        "text-[var(--accent)]",
        "shadow-[0_0_20px_var(--accent)]/10",
      ],
      collapsed && ["px-3 py-1.5 text-xs"],
    );

  return (
    <>
      {renderMobileDrawer && mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {renderMobileDrawer && mobileOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-72 bg-[var(--panel-bg-strong)] shadow-2xl transition-transform duration-300 md:hidden">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-[var(--ring-soft)] px-4 py-4">
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                {t("navigation.mobileMenu", { p1: "导航菜单" })}
              </span>
              <button
                type="button"
                className="rounded-lg p-2 transition-colors hover:bg-[var(--surface-muted)]"
                onClick={onMobileClose}
                aria-label={t("common.close", { p1: "关闭导航" })}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-2 overflow-y-auto p-4">
              {navItems.map((item) => {
                const isActive = matchesRoute(currentPath, item);
                return (
                  <TransitionLink
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition-all duration-200",
                      "hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]",
                      isActive && [
                        "border border-[var(--accent)]/20",
                        "bg-gradient-to-r from-[var(--accent)]/15 to-[var(--accent-strong)]/15",
                        "text-[var(--accent)]",
                      ],
                    )}
                    onClick={() => onMobileClose?.()}
                  >
                    <span className={cn(isActive ? "text-[var(--accent)]" : "text-[var(--text-secondary)]")}>
                      <NavIcon href={item.href} />
                    </span>
                    <span>{item.label}</span>
                    {isActive ? <span className="ml-auto h-2 w-2 rounded-full bg-[var(--accent)]" /> : null}
                  </TransitionLink>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {renderDesktop ? (
        <nav
          className={cn(
            "header-nav-row transition-all duration-300",
            collapsed ? "nav-collapsed" : "",
          )}
          aria-label={t("navigation.primary", { p1: "主导航" })}
        >
          <div
            className={cn(
              "header-nav-track transition-all duration-300",
              collapsed ? "gap-1" : "",
            )}
            role="tablist"
          >
            {navItems.map((item) => {
              const isActive = matchesRoute(currentPath, item);
              return (
                <TransitionLink
                  key={item.href}
                  href={item.href}
                  className={desktopNavItemClass(isActive)}
                  title={item.label}
                  role="tab"
                  aria-selected={isActive}
                >
                  <span className={cn("flex items-center gap-2", collapsed && "gap-1")}>
                    <span className={cn("transition-transform duration-200 group-hover:scale-110", collapsed && "hidden")}>
                      <NavIcon href={item.href} />
                    </span>
                    {!collapsed ? item.label : <span className="nav-collapsed-icon">{item.shortLabel}</span>}
                    {!collapsed && SHORTCUT_MAP[item.href] && (
                      <kbd className="nav-shortcut-badge">{SHORTCUT_MAP[item.href].replace("Alt+", "")}</kbd>
                    )}
                  </span>
                  {isActive ? (
                    <span className="absolute bottom-0 left-1/2 h-0.5 w-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)]" />
                  ) : null}
                </TransitionLink>
              );
            })}
          </div>
        </nav>
      ) : null}
    </>
  );
}
