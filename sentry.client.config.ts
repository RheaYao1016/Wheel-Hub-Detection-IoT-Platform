import * as Sentry from "@sentry/nextjs";

/**
 * Sentry 客户端配置
 * 用于浏览器端错误追踪和性能监控
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 环境标识
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || "development",

  // 性能监控 - 调整采样率
  tracesSampleRate:
    process.env.NODE_ENV === "production"
      ? parseFloat(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || "0.1")
      : 1.0,

  // 性能分析采样率（更精细的性能数据）
  profilesSampleRate:
    process.env.NODE_ENV === "production"
      ? parseFloat(process.env.NEXT_PUBLIC_SENTRY_PROFILES_SAMPLE_RATE || "0.1")
      : 1.0,

  // 会话回放配置
  replaysSessionSampleRate: 0,

  // 错误回放采样率 - 错误时始终录制
  replaysOnErrorSampleRate: 0.1,

  // 集成配置
  integrations: [
    Sentry.httpClientIntegration(),
  ],

  // 忽略特定的错误或URL
  ignoreErrors: [
    // 忽略常见的浏览器扩展错误
    /top\.g48tny/,
    /chrome-extension:/i,
    /moz-extension:/i,
    // 忽略网络请求取消（通常不是真正的错误）
    /Request failed/i,
    /Network Error/i,
    // 忽略已知的第三方脚本错误
    /Non-Error promise rejection captured/i,
  ],

  // 忽略特定的URL（如健康检查端点）
  denyUrls: [
    /chrome-extension:/i,
    /moz-extension:/i,
  ],

  // 错误去指纹分组
  beforeSend(event) {
    // 在开发环境中不发送错误到Sentry
    if (process.env.NODE_ENV !== "production") {
      return null;
    }
    return event;
  },

  // 配置错误去重
  normalizeDepth: 5,
  maxBreadcrumbs: 50,

  // 调试模式（仅开发环境）
  debug: process.env.NODE_ENV !== "production",
});
