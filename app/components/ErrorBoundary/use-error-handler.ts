"use client";

import { useState, useCallback, useRef } from "react";
import { errorLogger, type ErrorLog } from "./error-logger";

/**
 * useErrorHandler Hook
 * 提供统一的错误处理和用户提示功能
 */
export function useErrorHandler(options?: {
  onError?: (error: Error, context?: Record<string, unknown>) => void;
  showNotification?: boolean;
}) {
  const [currentError, setCurrentError] = useState<Error | null>(null);
  const [errorCount, setErrorCount] = useState(0);
  const isMountedRef = useRef(true);

  // 组件卸载时清理
  useState(() => {
    return () => {
      isMountedRef.current = false;
    };
  });

  /**
   * 处理错误
   */
  const handleError = useCallback(
    (error: Error | unknown, context?: Record<string, unknown>) => {
      const errorObj =
        error instanceof Error ? error : new Error(String(error));

      // 更新状态
      if (isMountedRef.current) {
        setCurrentError(errorObj);
        setErrorCount((prev) => prev + 1);
      }

      // 记录日志
      errorLogger.logUnhandledError(errorObj);

      // 调用自定义回调
      if (options?.onError) {
        options.onError(errorObj, context);
      }

      // 显示通知（如果启用）
      if (options?.showNotification) {
        showNotification(errorObj.message, "error");
      }

      return errorObj;
    },
    [options]
  );

  /**
   * 清除当前错误
   */
  const clearError = useCallback(() => {
    if (isMountedRef.current) {
      setCurrentError(null);
    }
  }, []);

  /**
   * 重置错误计数
   */
  const resetCount = useCallback(() => {
    if (isMountedRef.current) {
      setErrorCount(0);
    }
  }, []);

  return {
    currentError,
    errorCount,
    handleError,
    clearError,
    resetCount,
  };
}

/**
 * useApiError Hook
 * 专门用于处理API调用错误的Hook
 * 提供重试、加载状态管理等功能
 */
export function useApiError<T>(
  apiCall: () => Promise<T>,
  options?: {
    retries?: number;
    retryDelay?: number;
    onError?: (error: Error) => void;
    onSuccess?: (data: T) => void;
  }
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    retries = 2,
    retryDelay = 1000,
    onError,
    onSuccess,
  } = options || {};

  /**
   * 执行API调用
   */
  const execute = useCallback(async () => {
    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        if (controller.signal.aborted) {
          return;
        }

        const result = await apiCall();

        if (isMountedRef.current) {
          setData(result);
          setError(null);
          setLoading(false);
          onSuccess?.(result);
        }

        return;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        // 检查是否应该重试
        const shouldRetry = attempt < retries && !controller.signal.aborted;

        if (!shouldRetry) {
          break;
        }

        // 等待后重试
        const delay = retryDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // 所有尝试都失败
    if (isMountedRef.current) {
      setError(lastError);
      setLoading(false);
      setRetryCount((prev) => prev + 1);

      if (lastError) {
        errorLogger.logApiError(lastError, {
          url: "unknown",
          method: "unknown",
        });
        onError?.(lastError);
      }
    }
  }, [apiCall, retries, retryDelay, onError, onSuccess]);

  /**
   * 手动重试
   */
  const retry = useCallback(() => {
    execute();
  }, [execute]);

  // 自动执行
  useState(() => {
    execute();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  });

  return {
    data,
    loading,
    error,
    retryCount,
    retry,
    refetch: execute,
  };
}

// 组件挂载状态跟踪
const isMountedRef = { current: true };

/**
 * 显示用户友好的通知消息
 */
function showNotification(message: string, type: "error" | "warning" | "info" = "error") {
  // 创建通知元素
  const notification = document.createElement("div");
  notification.className = `app-notification app-notification--${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    background: ${type === "error" ? "#ff4757" : type === "warning" ? "#ffa502" : "#1e90ff"};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    font-size: 14px;
    max-width: 400px;
    animation: slideIn 0.3s ease-out;
  `;

  document.body.appendChild(notification);

  // 3秒后自动移除
  setTimeout(() => {
    notification.style.animation = "slideOut 0.3s ease-out";
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}
