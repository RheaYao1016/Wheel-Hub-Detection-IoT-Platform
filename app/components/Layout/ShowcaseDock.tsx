"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  PanelLeft,
  ChevronLeft,
  ChevronRight,
  Presentation,
} from "lucide-react";
import { navigateWithTransition } from "@/lib/navigation-transition";
import { readStoredAuthSession } from "@/lib/auth-session";
import type { UserRole } from "@/types/auth";
import { cn } from "@/lib/utils";
import { Button } from "../ui/Button";

type DemoRoute = {
  href: string;
  label: string;
  aliases?: string[];
};

const PRESENTATION_MODE_KEY = "app_presentation_mode";

const CORE_ROUTES: DemoRoute[] = [
  { href: "/home", label: "1. Overview" },
  { href: "/visualize", label: "2. Command" },
  {
    href: "/operations",
    label: "3. Operations",
    aliases: ["/monitor", "/digital-twin"],
  },
  { href: "/workspace", label: "4. Workspace" },
  {
    href: "/ai-assistant",
    label: "5. AI",
    aliases: ["/data-hub", "/reports", "/training", "/annotation"],
  },
];

const ADMIN_ROUTES: DemoRoute[] = [{ href: "/admin", label: "6. Admin" }];

function normalizeRole(role: UserRole | null) {
  return role === "user" ? "operator" : role;
}

function matches(currentPath: string, route: DemoRoute) {
  if (currentPath === route.href || currentPath.startsWith(`${route.href}/`)) {
    return true;
  }

  return (
    route.aliases?.some(
      (alias) => currentPath === alias || currentPath.startsWith(`${alias}/`),
    ) ?? false
  );
}

function applyPresentationMode(enabled: boolean) {
  const root = document.documentElement;
  root.dataset.presentation = enabled ? "on" : "off";
}

export default function ShowcaseDock() {
  const pathname = usePathname();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);
  const [role, setRole] = useState<UserRole | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncSession = () => {
      const session = readStoredAuthSession();
      setRole(session?.role ?? null);
    };

    const persistedMode =
      window.localStorage.getItem(PRESENTATION_MODE_KEY) === "on";
    setPresentationMode(persistedMode);
    applyPresentationMode(persistedMode);
    syncSession();

    window.addEventListener("storage", syncSession);
    window.addEventListener("app:role-change", syncSession as EventListener);

    return () => {
      window.removeEventListener("storage", syncSession);
      window.removeEventListener(
        "app:role-change",
        syncSession as EventListener,
      );
    };
  }, []);

  const demoRoutes = useMemo(() => {
    const normalized = normalizeRole(role);
    return normalized === "admin"
      ? [...CORE_ROUTES, ...ADMIN_ROUTES]
      : CORE_ROUTES;
  }, [role]);

  const activeIndex = useMemo(
    () => demoRoutes.findIndex((item) => matches(pathname, item)),
    [demoRoutes, pathname],
  );

  const hasPrev = activeIndex > 0;
  const hasNext = activeIndex >= 0 && activeIndex < demoRoutes.length - 1;

  const goTo = (href: string) => {
    navigateWithTransition(router, href);
  };

  const goPrev = () => {
    if (!hasPrev) return;
    goTo(demoRoutes[activeIndex - 1].href);
  };

  const goNext = () => {
    if (!hasNext) return;
    goTo(demoRoutes[activeIndex + 1].href);
  };

  const togglePresentationMode = () => {
    const next = !presentationMode;
    setPresentationMode(next);
    window.localStorage.setItem(PRESENTATION_MODE_KEY, next ? "on" : "off");
    applyPresentationMode(next);
  };

  if (pathname === "/login") {
    return null;
  }

  return (
    <aside
      className={cn(
        "fixed right-4 top-24 z-40 flex flex-col items-end gap-2 transition-all",
      )}
    >
      <Button
        variant="outline"
        size="icon"
        onClick={() => setExpanded((value) => !value)}
        aria-label={expanded ? "Hide Demo Dock" : "Show Demo Dock"}
        className="h-10 w-10 rounded-full border-border bg-card/80 backdrop-blur-md shadow-card hover:bg-accent/10 hover:text-accent"
      >
        <PanelLeft
          className={cn("h-5 w-5 transition-transform", expanded && "rotate-180")}
        />
      </Button>

      {expanded ? (
        <div className="w-64 rounded-2xl border border-border bg-card/95 p-4 shadow-card-hover backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold">Presentation Controls</span>
            <span className="text-xs text-muted-foreground">
              {activeIndex >= 0
                ? `Step ${activeIndex + 1} / ${demoRoutes.length}`
                : "Current page not in route"}
            </span>
          </div>

          <div className="mb-3 grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goPrev}
              disabled={!hasPrev}
              className="px-2"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={goNext}
              disabled={!hasNext}
              className="px-2"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant={presentationMode ? "default" : "outline"}
              size="sm"
              onClick={togglePresentationMode}
              className="px-2"
            >
              <Presentation className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-col gap-1">
            {demoRoutes.map((route, index) => {
              const active = index === activeIndex;
              return (
                <button
                  key={route.href}
                  type="button"
                  onClick={() => goTo(route.href)}
                  className={cn(
                    "rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary border border-primary/30"
                      : "text-muted-foreground hover:bg-accent/10 hover:text-foreground"
                  )}
                >
                  {route.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
