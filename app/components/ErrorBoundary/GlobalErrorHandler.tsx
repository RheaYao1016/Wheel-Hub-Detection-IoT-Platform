"use client";

import { useEffect } from "react";
import { errorLogger } from "@/app/components/ErrorBoundary/error-logger";

/**
 * GlobalErrorHandler 组件
 * 在应用启动时注册全局错误监听器
 * 捕获未处理的Promise拒绝和运行时错误
 * 
 * 应在根布局中使用一次
 */
export default function GlobalErrorHandler() {
  useEffect(() => {
    // 捕获未处理的运行时错误
    const handleRuntimeError = (event: ErrorEvent) => {
      event.preventDefault(); // 阻止默认控制台输出

      errorLogger.logUnhandledError(event.error || new Error(event.message));

      console.error("[GlobalErrorHandler] Runtime Error:", {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
      });
    };

    // 捕获未处理的Promise拒绝
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      event.preventDefault();

      const error =
        event.reason instanceof Error
          ? event.reason
          : new Error(String(event.reason));

      errorLogger.logUnhandledError(error);

      console.error("[GlobalErrorHandler] Unhandled Promise Rejection:", error);
    };

    // 注册全局监听器
    window.addEventListener("error", handleRuntimeError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    // 清理监听器
    return () => {
      window.removeEventListener("error", handleRuntimeError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  // 这个组件不渲染任何内容
  return null;
}
