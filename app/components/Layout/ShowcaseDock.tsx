"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { navigateWithTransition } from "@/lib/navigation-transition";
import { readStoredAuthSession } from "@/lib/auth-session";
import type { UserRole } from "@/types/auth";

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
    <aside className={`showcase-dock ${expanded ? "showcase-dock-open" : ""}`}>
      <button
        type="button"
        className="showcase-dock-toggle"
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? "Hide Demo Dock" : "Demo Dock"}
      </button>

      {expanded ? (
        <div className="showcase-dock-body">
          <div className="showcase-dock-head">
            <strong>Presentation Controls</strong>
            <span>
              {activeIndex >= 0
                ? `Step ${activeIndex + 1} / ${demoRoutes.length}`
                : "Current page not in route"}
            </span>
          </div>

          <div className="showcase-dock-actions">
            <button
              type="button"
              className="showcase-dock-btn"
              onClick={goPrev}
              disabled={!hasPrev}
            >
              Previous
            </button>
            <button
              type="button"
              className="showcase-dock-btn showcase-dock-btn-primary"
              onClick={goNext}
              disabled={!hasNext}
            >
              Next
            </button>
            <button
              type="button"
              className={`showcase-dock-btn ${
                presentationMode ? "showcase-dock-btn-active" : ""
              }`}
              onClick={togglePresentationMode}
            >
              {presentationMode ? "Presentation: On" : "Presentation: Off"}
            </button>
          </div>

          <div className="showcase-dock-route-list">
            {demoRoutes.map((route, index) => {
              const active = index === activeIndex;
              return (
                <button
                  key={route.href}
                  type="button"
                  className={`showcase-route-chip ${
                    active ? "showcase-route-chip-active" : ""
                  }`}
                  onClick={() => goTo(route.href)}
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

