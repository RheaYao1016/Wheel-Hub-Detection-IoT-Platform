/**
 * ErrorBoundary 组件导出
 * 提供完整的错误边界和异常监控功能
 */

// 核心错误边界组件
export { default } from "./ErrorBoundary";
export { default as ErrorBoundary } from "./ErrorBoundary";

// 路由级别错误边界
export { default as RouteErrorBoundary } from "./RouteErrorBoundary";

// 错误日志查看器
export { default as ErrorLogViewer } from "./ErrorLogViewer";

// 错误日志管理
export { errorLogger } from "./error-logger";
export type { ErrorLog, ApiError } from "./error-logger";

// API错误处理
export {
  createMonitoredAxios,
  fetchWithRetry,
  postWithRetry,
  reportError,
  api,
} from "./api-error-handler";

// 全局错误处理器
export { default as GlobalErrorHandler } from "./GlobalErrorHandler";

// 便捷Hook
export { useErrorHandler, useApiError } from "./use-error-handler";
