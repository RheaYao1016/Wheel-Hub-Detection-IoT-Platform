"use client";

import { useEffect } from "react";

export default function GlobalErrorHandler() {
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      event.preventDefault();

      console.error("[GlobalErrorHandler] Unhandled promise rejection:", event.reason);

      const errorInfo = {
        type: "unhandledrejection",
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
        timestamp: new Date().toISOString(),
        url: typeof window !== "undefined" ? window.location.href : "unknown",
      };

      try {
        if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
          const errors = JSON.parse(localStorage.getItem("error_logs") || "[]");
          errors.push(errorInfo);
          localStorage.setItem("error_logs", JSON.stringify(errors.slice(-50)));
        }
      } catch (e) {
        console.error("[GlobalErrorHandler] Failed to log error:", e);
      }

      const isNetworkError =
        event.reason instanceof TypeError &&
        /fetch|network|Failed to fetch/i.test(event.reason.message);

      const isTimeoutError =
        event.reason instanceof DOMException &&
        event.reason.name === "AbortError";

      const isAuthError =
        event.reason?.message?.includes("401") ||
        event.reason?.message?.includes("Unauthorized");

      if (isNetworkError || isTimeoutError) {
        console.warn("[GlobalErrorHandler] Network/timeout error detected, this is usually non-critical");
        return;
      }

      if (isAuthError) {
        console.warn("[GlobalErrorHandler] Auth error detected, session may have expired");
        return;
      }

      // Page reload is intentionally avoided here; the GlobalErrorBoundary will
      // render a recovery UI for rendering errors, and unexpected async errors
      // are logged for diagnostics without disrupting the user.
    };

    const handleError = (event: ErrorEvent) => {
      console.error("[GlobalErrorHandler] Uncaught error:", event.error);

      if (
        event.message?.includes("Minified React error") ||
        event.message?.includes("ResizeObserver loop") ||
        event.message?.includes("removeChild") ||
        event.message?.includes("The node to be removed") ||
        (event.error?.message && (
          event.error.message.includes("removeChild") ||
          event.error.message.includes("The node to be removed")
        ))
      ) {
        event.preventDefault();
        console.warn("[GlobalErrorHandler] Suppressing known DOM/React error:", event.message || event.error?.message);
        return;
      }

      const errorInfo = {
        type: "error",
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        timestamp: new Date().toISOString(),
        url: typeof window !== "undefined" ? window.location.href : "unknown",
      };

      try {
        if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
          const errors = JSON.parse(localStorage.getItem("error_logs") || "[]");
          errors.push(errorInfo);
          localStorage.setItem("error_logs", JSON.stringify(errors.slice(-50)));
        }
      } catch (e) {
        console.error("[GlobalErrorHandler] Failed to log error:", e);
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleError);
    };
  }, []);

  return null;
}
