"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import { errorLogger } from "@/app/components/ErrorBoundary/error-logger";

/**
 * Segment-level error page (app/error.tsx)
 * 路由段级别的错误页面，替代浏览器默认错误
 * 当某个路由段（如某个页面或布局）发生错误时显示
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // 记录错误到日志系统
    errorLogger.logRouteError(error, {
      route: window.location.pathname,
    });

    // 上报到Sentry
    Sentry.captureException(error, {
      tags: {
        error_type: "route_error",
        route: window.location.pathname,
      },
      contexts: {
        route: {
          pathname: window.location.pathname,
          digest: error.digest,
        },
      },
    });

    // 在控制台输出详细错误信息
    console.error("[Route Error]", error);
    console.error("Error Digest:", error.digest);
  }, [error]);

  const handleRetry = () => {
    reset();
  };

  const handleGoHome = () => {
    router.push("/home");
  };

  const handleGoBack = () => {
    router.back();
  };

  return (
    <div className="error-page">
      <div className="error-page-container">
        {/* 错误图标 */}
        <div className="error-page-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="80"
            height="80"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        {/* 错误标题 */}
        <h1 className="error-page-title">页面加载出错</h1>

        {/* 错误描述 */}
        <p className="error-page-description">
          很抱歉，当前页面在加载过程中遇到了错误。这可能是由于以下原因：
        </p>
        <ul className="error-page-causes">
          <li>网络连接不稳定</li>
          <li>服务器暂时不可用</li>
          <li>数据加载异常</li>
          <li>浏览器兼容性问题</li>
        </ul>

        {/* 开发环境显示错误详情 */}
        {process.env.NODE_ENV === "development" && (
          <details className="error-page-details">
            <summary>查看技术详情</summary>
            <div className="error-page-details-content">
              <p>
                <strong>错误信息：</strong>
                {error.message}
              </p>
              <p>
                <strong>错误摘要：</strong>
                {error.digest || "N/A"}
              </p>
              <pre className="error-page-stack">
                {error.stack || "No stack trace available"}
              </pre>
            </div>
          </details>
        )}

        {/* 操作按钮 */}
        <div className="error-page-actions">
          <button
            type="button"
            className="error-page-btn primary"
            onClick={handleRetry}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            重新加载
          </button>
          <button
            type="button"
            className="error-page-btn secondary"
            onClick={handleGoBack}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            返回上一页
          </button>
          <Link href="/home" className="error-page-btn outline">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            返回首页
          </Link>
        </div>

        {/* 技术支持信息 */}
        <div className="error-page-footer">
          <p>
            如果问题持续存在，请联系技术支持或查看
            <Link href="/admin" className="error-page-link">
              管理控制台
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
