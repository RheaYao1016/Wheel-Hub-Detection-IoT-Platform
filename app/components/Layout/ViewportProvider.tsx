"use client";

import { useEffect } from "react";

type ViewportMode = "mobile" | "tablet" | "desktop" | "wide";

function resolveViewportMode(width: number): ViewportMode {
  if (width < 768) return "mobile";
  if (width < 1200) return "tablet";
  if (width < 1680) return "desktop";
  return "wide";
}

function applyViewportMetrics() {
  const root = document.documentElement;
  const viewport = window.visualViewport;
  const width = viewport?.width ?? window.innerWidth;
  const height = viewport?.height ?? window.innerHeight;
  const mode = resolveViewportMode(width);

  root.style.setProperty("--app-vw", `${width * 0.01}px`);
  root.style.setProperty("--app-vh", `${height * 0.01}px`);
  root.style.setProperty("--app-shell-height", `${height}px`);
  root.dataset.viewport = mode;
}

export default function ViewportProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    applyViewportMetrics();

    const onResize = () => applyViewportMetrics();
    const viewport = window.visualViewport;

    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    viewport?.addEventListener("resize", onResize);
    viewport?.addEventListener("scroll", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      viewport?.removeEventListener("resize", onResize);
      viewport?.removeEventListener("scroll", onResize);
    };
  }, []);

  return <>{children}</>;
}
