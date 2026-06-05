import axios, { type AxiosError, type AxiosRequestConfig } from "axios";
import * as Sentry from "@sentry/nextjs";
import { errorLogger } from "./error-logger";

/**
 * API错误处理拦截器
 * 自动捕获和上报API调用错误
 */

// 存储原始请求配置的WeakMap
const requestConfigMap = new WeakMap<
  Promise<unknown>,
  { config: AxiosRequestConfig; startTime: number }
>();

/**
 * 创建带有错误监控的axios实例
 */
export function createMonitoredAxios(baseConfig?: AxiosRequestConfig) {
  const instance = axios.create(baseConfig);

  // 请求拦截器 - 记录请求开始时间
  instance.interceptors.request.use(
    (config) => {
      (config as any).__startTime = Date.now();
      return config;
    },
    (error) => Promise.reject(error)
  );

  // 响应拦截器 - 捕获并上报错误
  instance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      const config = error.config as AxiosRequestConfig & {
        __startTime?: number;
      };

      // 提取错误信息
      const apiError = {
        code: error.code || "UNKNOWN",
        message: error.message,
        status: error.response?.status,
        url: config?.url,
        method: config?.method?.toUpperCase(),
        timestamp: new Date().toISOString(),
        stack: error.stack,
      };

      // 上报错误到日志系统
      errorLogger.logApiError(error, {
        url: config?.url || "unknown",
        method: config?.method || "unknown",
        status: error.response?.status,
        requestData: config?.data,
      });

      // 上报到Sentry
      Sentry.captureException(error, {
        tags: {
          error_type: "api_error",
          http_method: config?.method?.toUpperCase() || "UNKNOWN",
          http_status: String(error.response?.status || 0),
        },
        contexts: {
          request: {
            url: config?.url,
            method: config?.method,
          },
          response: {
            status: error.response?.status,
            data: error.response?.data,
          },
        },
      });

      // 根据状态码提供不同的错误提示
      if (error.response) {
        const status = error.response.status;
        switch (status) {
          case 400:
            console.warn("[API] 请求参数错误:", error.response.data);
            break;
          case 401:
            console.warn("[API] 未授权访问");
            // 可以在这里触发登录跳转
            break;
          case 403:
            console.warn("[API] 权限不足");
            break;
          case 404:
            console.warn("[API] 资源不存在:", config?.url);
            break;
          case 500:
            console.error("[API] 服务器内部错误");
            break;
          default:
            console.error(`[API] 请求失败 (HTTP ${status}):`, error.message);
        }
      } else if (error.request) {
        // 请求已发出但没有收到响应
        console.error("[API] 网络错误 - 未收到服务器响应");
      } else {
        // 请求配置时发生错误
        console.error("[API] 请求配置错误:", error.message);
      }

      return Promise.reject(error);
    }
  );

  return instance;
}

/**
 * 带重试机制的API请求函数
 */
export async function fetchWithRetry<T = unknown>(
  url: string,
  config?: AxiosRequestConfig & {
    retries?: number;
    retryDelay?: number;
    retryStatusCodes?: number[];
  }
): Promise<T> {
  const {
    retries = 2,
    retryDelay = 1000,
    retryStatusCodes = [408, 429, 500, 502, 503, 504],
    ...axiosConfig
  } = config || {};

  let lastError: AxiosError | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await axios.get<T>(url, axiosConfig);
      return response.data;
    } catch (error) {
      lastError = error as AxiosError;

      // 检查是否应该重试
      const status = (error as AxiosError).response?.status;
      const shouldRetry =
        attempt < retries &&
        (!status || retryStatusCodes.includes(status));

      if (!shouldRetry) {
        break;
      }

      // 等待后重试（指数退避）
      const delay = retryDelay * Math.pow(2, attempt);
      console.warn(
        `[API Retry] 请求失败，${delay}ms后重试 (${attempt + 1}/${retries}):`,
        url
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // 上报最终失败到Sentry
  if (lastError) {
    Sentry.captureException(lastError, {
      tags: {
        error_type: "api_retry_exhausted",
        url,
      },
    });
  }

  // 所有重试都失败后抛出最后的错误
  throw lastError;
}

/**
 * POST请求带重试
 */
export async function postWithRetry<T = unknown>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig & {
    retries?: number;
    retryDelay?: number;
    retryStatusCodes?: number[];
  }
): Promise<T> {
  const {
    retries = 2,
    retryDelay = 1000,
    retryStatusCodes = [408, 429, 500, 502, 503, 504],
    ...axiosConfig
  } = config || {};

  let lastError: AxiosError | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await axios.post<T>(url, data, axiosConfig);
      return response.data;
    } catch (error) {
      lastError = error as AxiosError;

      const status = (error as AxiosError).response?.status;
      const shouldRetry =
        attempt < retries &&
        (!status || retryStatusCodes.includes(status));

      if (!shouldRetry) {
        break;
      }

      const delay = retryDelay * Math.pow(2, attempt);
      console.warn(
        `[API Retry] POST请求失败，${delay}ms后重试 (${attempt + 1}/${retries}):`,
        url
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // 上报最终失败到Sentry
  if (lastError) {
    Sentry.captureException(lastError, {
      tags: {
        error_type: "api_retry_exhausted",
        url,
        method: "POST",
      },
    });
  }

  throw lastError;
}

/**
 * 全局错误上报工具函数
 */
export function reportError(
  error: Error | unknown,
  context?: Record<string, unknown>
): void {
  const errorObj = error instanceof Error ? error : new Error(String(error));

  errorLogger.logUnhandledError(errorObj);

  // 上报到Sentry
  Sentry.captureException(errorObj, {
    tags: {
      error_type: "manual_report",
    },
    contexts: {
      custom: context || {},
    },
  });

  // 发送到服务器（如果配置了错误收集服务）
  if (process.env.NEXT_PUBLIC_ERROR_REPORT_URL) {
    fetch(process.env.NEXT_PUBLIC_ERROR_REPORT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: errorObj.message,
        stack: errorObj.stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        context,
        timestamp: new Date().toISOString(),
      }),
      keepalive: true, // 确保页面关闭时也能发送
    }).catch(() => {
      // 忽略上报错误
    });
  }
}

// 导出默认的带监控的axios实例
export const api = createMonitoredAxios({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "/api",
  timeout: 30000,
});
