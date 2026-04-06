"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { readStoredAuthSession } from "@/lib/auth-session";
import type { UserRole } from "@/types/auth";
import { useLocale } from "../Locale/LocaleProvider";
import TransitionLink from "./TransitionLink";
import { cn } from "@/lib/utils";

type RoleState = UserRole | null;

type NavItem = {
  href: string;
  labelZh: string;
  labelEn: string;
  aliases?: string[];
};

const CORE_ITEMS: NavItem[] = [
  { href: "/home", labelZh: "项目总览", labelEn: "Overview" },
  { href: "/visualize", labelZh: "指挥中心", labelEn: "Command Center" },
  { href: "/operations", labelZh: "现场中台", labelEn: "Operations Hub", aliases: ["/monitor", "/digital-twin"] },
  {
    href: "/workspace",
    labelZh: "智能工作台",
    labelEn: "AI Workspace",
    aliases: ["/ai-assistant", "/data-hub", "/reports", "/training", "/annotation"],
  },
];

const ADMIN_ITEMS: NavItem[] = [
  {
    href: "/admin",
    labelZh: "运营后台",
    labelEn: "Admin Console",
    aliases: ["/admin/alerts", "/admin/data-import", "/admin/inspections", "/admin/storage", "/admin/wheels"],
  },
];

function normalizeRole(role: RoleState) {
  return role === "user" ? "operator" : role;
}

function matchesRoute(currentPath: string, item: NavItem) {
  if (currentPath === item.href || currentPath.startsWith(`${item.href}/`)) {
    return true;
  }

  return item.aliases?.some((alias) => currentPath === alias || currentPath.startsWith(`${alias}/`)) ?? false;
}

export default function Navigation() {
  const { locale } = useLocale();
  const pathname = usePathname();
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

    if (normalizedRole === "operator") {
      return CORE_ITEMS;
    }

    if (normalizedRole === "engineer" || normalizedRole === "viewer") {
      return CORE_ITEMS.filter((item) => item.href !== "/visualize" && item.href !== "/operations");
    }

    return CORE_ITEMS;
  }, [role]);

  return (
    <nav className="flex flex-1 justify-center">
      <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
        {navItems.map((item) => {
          const isActive = matchesRoute(currentPath, item);
          return (
            <TransitionLink
              key={item.href}
              href={item.href}
              className={cn(
                "nav-pill relative px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300",
                "hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2",
                isActive && [
                  "nav-pill-active",
                  "bg-gradient-to-r from-[var(--accent)]/20 to-[var(--accent-strong)]/20",
                  "text-[var(--accent)]",
                  "border border-[var(--accent)]/30",
                  "shadow-[0_0_20px_var(--accent)]/10",
                ]
              )}
            >
              {locale === "zh-CN" ? item.labelZh : item.labelEn}
              {isActive && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] rounded-full" />
              )}
            </TransitionLink>
          );
        })}
      </div>
    </nav>
  );
}
