"use client";

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

type NavigationOptions = {
  replace?: boolean;
  delay?: number;
};

type TransitionDocument = Document & {
  startViewTransition?: (callback: () => void | Promise<void>) => { finished: Promise<void> };
};

let isNavigating = false;
let lastNavigationTime = 0;
let pendingNavigation: { router: AppRouterInstance; href: string; options: NavigationOptions } | null = null;

const NAVIGATION_COOLDOWN_MS = 500;
const MAX_PENDING_DELAY_MS = 2000;

function canNavigate(): boolean {
  const now = Date.now();
  if (isNavigating) {
    console.warn("[SafeNavigation] Navigation already in progress, queuing...");
    return false;
  }
  
  if (now - lastNavigationTime < NAVIGATION_COOLDOWN_MS) {
    console.warn(`[SafeNavigation] Cooldown active (${now - lastNavigationTime}ms < ${NAVIGATION_COOLDOWN_MS}ms), queuing...`);
    return false;
  }
  
  return true;
}

async function executeNavigation(router: AppRouterInstance, href: string, options: NavigationOptions = {}): Promise<void> {
  if (!canNavigate()) {
    pendingNavigation = { router, href, options };
    
    const waitTime = Math.min(
      NAVIGATION_COOLDOWN_MS - (Date.now() - lastNavigationTime),
      MAX_PENDING_DELAY_MS
    );
    
    if (waitTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
    
    if (pendingNavigation?.href === href && !isNavigating) {
      pendingNavigation = null;
      await executeNavigation(router, href, options);
    }
    return;
  }

  isNavigating = true;
  lastNavigationTime = Date.now();

  try {
    const runNavigation = () => {
      if (options.replace) {
        router.replace(href);
        return;
      }
      router.push(href);
    };

    if (typeof document === "undefined" || typeof window === "undefined") {
      runNavigation();
      return;
    }

    const transitionDocument = document as TransitionDocument;
    if (typeof transitionDocument.startViewTransition === "function") {
      try {
        transitionDocument.startViewTransition(() => {
          runNavigation();
        });
      } catch (transitionError) {
        console.warn("[SafeNavigation] View transition failed, using fallback:", transitionError);
        runNavigation();
      }
    } else {
      runNavigation();
    }

    if (options.delay && options.delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, options.delay));
    }
  } finally {
    setTimeout(() => {
      isNavigating = false;
      
      if (pendingNavigation && pendingNavigation.href !== href) {
        const nextNav = pendingNavigation;
        pendingNavigation = null;
        executeNavigation(nextNav.router, nextNav.href, nextNav.options).catch(console.error);
      }
    }, 100);
  }
}

export function safeNavigate(
  router: AppRouterInstance,
  href: string,
  options: NavigationOptions = {},
): Promise<void> {
  return executeNavigation(router, href, options);
}

export function safeRedirect(
  router: AppRouterInstance,
  href: string,
  options: NavigationOptions = {},
): void {
  executeNavigation(router, href, { ...options, replace: true }).catch((error) => {
    console.error("[SafeNavigation] Redirect failed:", error);
    try {
      if (typeof window !== "undefined") {
        window.location.href = href;
      }
    } catch (fallbackError) {
      console.error("[SafeNavigation] Fallback redirect also failed:", fallbackError);
    }
  });
}

export function safeLoginRedirect(
  router: AppRouterInstance,
  role: string,
): void {
  const targetPath = role === "admin" ? "/admin" : "/workspace";
  safeRedirect(router, targetPath, { delay: 300 });
}

export function clearPendingNavigation(): void {
  pendingNavigation = null;
  isNavigating = false;
}
