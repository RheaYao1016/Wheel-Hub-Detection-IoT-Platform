"use client";

import { useEffect, useRef } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * 页面性能监控Hook
 * 自动追踪页面加载时间和用户交互
 */
export function usePagePerformance(pageName: string) {
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const startTime = startTimeRef.current;

    // 追踪页面加载完成
    const loadTime = Date.now() - startTime;

    // 上报页面加载性能指标
    Sentry.metrics.distribution("page.load_time", loadTime, {
      unit: "millisecond",
      tags: {
        page: pageName,
      },
    });

    // 创建页面加载事务（使用startInactiveSpan以支持手动管理生命周期）
    const transaction = Sentry.startInactiveSpan({
      name: `page.${pageName}`,
      op: "navigation",
    });

    // 设置页面标签
    Sentry.setTag("page.name", pageName);
    Sentry.addBreadcrumb({
      message: `Navigated to page: ${pageName}`,
      category: "navigation",
      level: "info",
    });

    // 追踪首次内容绘制 (FCP)
    if (typeof window !== "undefined" && "performance" in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === "paint") {
            Sentry.metrics.distribution(`page.${entry.name}`, entry.startTime, {
              unit: "millisecond",
              tags: {
                page: pageName,
              },
            });
          }
        }
      });

      try {
        observer.observe({ type: "paint", buffered: true });
      } catch {
        // 浏览器不支持PerformanceObserver
      }

      // 清理
      return () => {
        observer.disconnect();
        transaction?.end();
      };
    }

    return () => {
      transaction?.end();
    };
  }, [pageName]);
}

/**
 * API调用性能监控Hook
 * 追踪API请求响应时间
 */
export function useApiPerformance(
  endpoint: string,
  startTime?: number
) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const trackApiCall = async <T>(
    apiFn: () => Promise<T>
  ): Promise<T> => {
    const callStart = startTime || Date.now();

    // 创建Sentry span
    const span = Sentry.startInactiveSpan({
      name: `api.${endpoint}`,
      op: "http.client",
      attributes: {
        "http.url": endpoint,
      },
    });

    try {
      const result = await apiFn();
      const duration = Date.now() - callStart;

      // 上报API性能
      Sentry.metrics.distribution("api.response_time", duration, {
        unit: "millisecond",
        tags: {
          endpoint,
          status: "success",
        },
      });

      span?.updateName(`api.${endpoint} (${duration}ms)`);
      return result;
    } catch (error) {
      const duration = Date.now() - callStart;

      // 上报API失败
      Sentry.metrics.distribution("api.response_time", duration, {
        unit: "millisecond",
        tags: {
          endpoint,
          status: "error",
        },
      });

      Sentry.captureException(error, {
        tags: {
          api_endpoint: endpoint,
        },
      });

      throw error;
    } finally {
      span?.end();
    }
  };

  return { trackApiCall };
}

/**
 * 用户操作追踪Hook
 * 追踪用户点击、表单提交等操作
 */
export function useUserTracking() {
  const trackAction = (
    actionName: string,
    metadata?: Record<string, string | number>
  ) => {
    // 添加面包屑
    Sentry.addBreadcrumb({
      message: `User action: ${actionName}`,
      category: "user.action",
      level: "info",
    });

    // 上报指标
    Sentry.metrics.distribution("user.action", 1, {
      unit: "none",
      tags: {
        action: actionName,
        ...metadata,
      },
    });
  };

  const trackError = (
    errorName: string,
    error: Error | string,
    metadata?: Record<string, string>
  ) => {
    const errorObj = typeof error === "string" ? new Error(error) : error;

    Sentry.captureException(errorObj, {
      tags: {
        error_name: errorName,
        ...metadata,
      },
    });
  };

  return { trackAction, trackError };
}
