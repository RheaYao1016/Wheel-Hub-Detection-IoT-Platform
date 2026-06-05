"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { errorLogger } from "@/app/components/ErrorBoundary/error-logger";

/**
 * Global error page (app/global-error.tsx)
 * 全局级别的错误页面，当根布局发生错误时显示
 * 这是最高级别的错误处理，会替换整个页面
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 记录严重错误到日志系统
    errorLogger.logRouteError(error, {
      route: "GLOBAL",
    });

    // 上报到Sentry（全局错误标记为fatal）
    Sentry.captureException(error, {
      level: "fatal",
      tags: {
        error_type: "global_error",
        severity: "critical",
      },
      contexts: {
        global: {
          digest: error.digest,
          environment: process.env.NODE_ENV,
        },
      },
    });

    // 在控制台输出详细错误信息
    console.error("[Global Error]", error);
    console.error("Error Digest:", error.digest);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body>
        <div className="global-error">
          <div className="global-error-container">
            {/* 严重错误图标 */}
            <div className="global-error-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="100"
                height="100"
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

            {/* 错误标题 */}
            <h1 className="global-error-title">系统发生严重错误</h1>

            {/* 错误描述 */}
            <p className="global-error-description">
              工业表面缺陷智能检测系统 遇到了无法恢复的错误。
              这可能是由于系统配置错误或关键组件加载失败导致的。
            </p>

            {/* 开发环境显示错误详情 */}
            {process.env.NODE_ENV === "development" && (
              <details className="global-error-details">
                <summary>查看错误堆栈</summary>
                <pre className="global-error-stack">
                  {error.stack || "No stack trace available"}
                </pre>
                <p>
                  <strong>Error Digest:</strong> {error.digest || "N/A"}
                </p>
              </details>
            )}

            {/* 操作按钮 */}
            <div className="global-error-actions">
              <button
                type="button"
                className="global-error-btn primary"
                onClick={reset}
              >
                尝试恢复
              </button>
              <Link href="/home" className="global-error-btn secondary">
                返回首页
              </Link>
            </div>

            {/* 技术支持 */}
            <div className="global-error-footer">
              <p className="global-error-contact">
                如果问题持续存在，请尝试以下操作：
              </p>
              <ul className="global-error-steps">
                <li>刷新浏览器页面 (Ctrl+R / Cmd+R)</li>
                <li>清除浏览器缓存和Cookie</li>
                <li>检查网络连接状态</li>
                <li>联系系统管理员</li>
              </ul>
              <p className="global-error-version">
                Version: 2.2.0 | Environment:{" "}
                {process.env.NODE_ENV || "production"}
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
