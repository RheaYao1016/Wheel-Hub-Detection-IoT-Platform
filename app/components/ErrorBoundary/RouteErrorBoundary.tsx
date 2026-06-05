"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import ErrorBoundary from "./ErrorBoundary";

interface RouteErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
}

/**
 * 路由级别错误边界
 * 专门处理页面路由切换时的错误
 */
export default function RouteErrorBoundary({
  children,
  fallback,
}: RouteErrorBoundaryProps) {
  const pathname = usePathname();
  const router = useRouter();

  // 当路由变化时，自动重置错误状态
  useEffect(() => {
    // 路由变化时清除可能的错误状态
    const handleError = (event: ErrorEvent) => {
      console.error("路由级别错误:", event.error);
    };

    window.addEventListener("error", handleError);
    return () => {
      window.removeEventListener("error", handleError);
    };
  }, [pathname]);

  const handleError = (error: Error) => {
    // 路由级别错误上报
    console.error(`[RouteErrorBoundary] ${pathname}:`, error);
  };

  return (
    <ErrorBoundary
      name={`Route: ${pathname}`}
      onError={handleError}
      fallback={
        fallback ||
        ((error, reset) => (
          <div className="route-error-boundary">
            <div className="route-error-content">
              <div className="route-error-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="64"
                  height="64"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h2 className="route-error-title">页面加载失败</h2>
              <p className="route-error-description">
                当前页面在加载过程中遇到了错误，这可能是由于网络问题或数据异常导致的。
              </p>
              {process.env.NODE_ENV === "development" && (
                <details className="route-error-details">
                  <summary>查看错误详情</summary>
                  <pre className="route-error-stack">{error.stack}</pre>
                </details>
              )}
              <div className="route-error-actions">
                <button
                  type="button"
                  className="route-error-button primary"
                  onClick={reset}
                >
                  重新加载
                </button>
                <button
                  type="button"
                  className="route-error-button secondary"
                  onClick={() => router.push("/home")}
                >
                  返回首页
                </button>
              </div>
            </div>
          </div>
        ))
      }
    >
      {children}
    </ErrorBoundary>
  );
}
