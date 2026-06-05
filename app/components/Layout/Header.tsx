"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import AccountMenu from "./AccountMenu";
import Navigation from "./Navigation";
import ThemeToggle from "../Theme/ThemeToggle";
import { Badge } from "../ui/Badge";
import { useLocale } from "../Locale/LocaleProvider";

export function useNavCollapsed() {
  const [navCollapsed, setNavCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("nav-collapsed");
    if (stored === "true") {
      setNavCollapsed(true);
    }
  }, []);

  const toggleNav = () => {
    setNavCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("nav-collapsed", String(next));
      return next;
    });
  };

  return { navCollapsed, toggleNav };
}

export default function Header() {
  const { navCollapsed, toggleNav } = useNavCollapsed();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { t } = useLocale();

  // Lock body scroll when mobile nav is open
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (mobileNavOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  // Close mobile nav on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileNavOpen) {
        setMobileNavOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileNavOpen]);

  return (
    <header
      className={`sticky top-0 z-50 w-full px-4 pt-3 md:px-6 md:pt-4 xl:px-8 transition-all duration-300 ${
        navCollapsed ? "header-collapsed" : ""
      }`}
    >
      <div className="header-shell mx-auto flex h-full max-w-[var(--content-max-width)] items-center justify-between gap-6">
        {/* Brand section */}
        <div className="header-brand-group flex min-w-0 shrink-0 items-center gap-3 md:gap-4">
          {/* Hamburger menu button - visible only on mobile */}
          <button
            type="button"
            className="md:hidden flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-xl bg-[var(--surface-muted)] border border-[var(--ring-soft)] transition-all duration-200 hover:bg-[var(--surface-muted-strong)] active:scale-95"
            onClick={() => setMobileNavOpen(true)}
            aria-label={t("common.menu", { p1: "打开导航菜单" })}
            aria-expanded={mobileNavOpen}
          >
            <svg
              className={`h-5 w-5 transition-transform duration-200 ${mobileNavOpen ? "rotate-90" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="18" y2="12" />
              <line x1="3" y1="18" x2="15" y2="18" />
            </svg>
          </button>

          {/* Logo button - desktop: toggle collapse, mobile: go home */}
          <button
            type="button"
            className="header-brand-mark group relative flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[var(--radius-xl)] bg-gradient-to-br from-[var(--accent)]/20 to-[var(--accent-strong)]/10 p-[3px] shadow-[var(--shadow-md)] backdrop-blur-xl transition-all duration-500 ease-out hover:scale-105 hover:shadow-[var(--shadow-glow)]"
            onClick={() => {
              if (window.innerWidth >= 768) {
                toggleNav();
              }
            }}
            title={navCollapsed ? t("common.expand", { p1: "展开导航" }) : t("common.collapse", { p1: "收起导航" })}
          >
            <div className="flex h-full w-full items-center justify-center rounded-[calc(var(--radius-xl)-3px)] bg-[var(--panel-bg)] p-2">
              <Image
                src="/images/logo.png"
                alt={t("common.logoAlt", { p1: "工业表面缺陷智能检测平台标识" })}
                width={28}
                height={28}
                className="h-auto w-auto max-h-full max-w-full object-contain drop-shadow-sm transition-transform duration-300 group-hover:rotate-12"
                priority
              />
            </div>
            <div className="pointer-events-none absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--text-primary)] px-2 py-0.5 text-[10px] text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              {navCollapsed ? t("common.expand", { p1: "展开" }) : t("common.collapse", { p1: "收起" })}
            </div>
          </button>

          {/* Title section */}
          <div
            className={`flex min-w-0 flex-col leading-tight transition-all duration-300 ${
              navCollapsed ? "w-0 overflow-hidden opacity-0" : "opacity-100"
            }`}
          >
            <span className="header-status-line">Wheel Hub Intelligence</span>
            <h1
              className="truncate text-base font-bold tracking-wide text-[var(--accent)] transition-colors duration-300 md:text-lg lg:text-xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {t("pages.home.copy024")}
            </h1>
            <span className="mt-[2px] truncate text-xs leading-relaxed text-[var(--text-secondary)] transition-colors duration-300 md:text-sm">
              {t("pages.home.copy025")}
            </span>
          </div>
        </div>

        {/* Controls section */}
        <div
          className={`header-controls flex shrink-0 items-center gap-1.5 md:gap-2.5 transition-all duration-300 ${
            navCollapsed ? "gap-1" : ""
          }`}
        >
          <Badge
            variant="glow"
            className={`hidden gap-2 px-3 py-1.5 text-xs lg:inline-flex ${navCollapsed ? "hidden" : ""}`}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-full w-2 rounded-full bg-emerald-400" />
            </span>
            {t("header.status.online", { p1: "系统在线" })}
          </Badge>
          <ThemeToggle />
          <AccountMenu />
        </div>

        {/* Desktop navigation only - mobile handled by drawer */}
        <div className="hidden md:block">
          <Navigation collapsed={navCollapsed} renderMobileDrawer={false} />
        </div>

        {/* Mobile navigation drawer */}
        <Navigation
          collapsed={false}
          mobileOpen={mobileNavOpen}
          onMobileClose={() => setMobileNavOpen(false)}
          renderDesktop={false}
        />
      </div>
    </header>
  );
}
