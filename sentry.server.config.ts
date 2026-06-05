import * as Sentry from "@sentry/nextjs";

/**
 * Sentry 服务端配置
 * 用于Node.js服务端错误追踪和性能监控
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

  // 集成配置
  integrations: [
    // HTTP客户端集成（追踪出站请求）- 暂时禁用以修复启动问题
    // Sentry.httpClientIntegration(),

    // Node.js性能监控
    // Sentry.postgresIntegration(),
    // Sentry.prismaIntegration(),
  ],

  // 忽略特定的错误
  ignoreErrors: [
    /ENOENT/,
    /ECONNREFUSED/,
  ],

  // 在开发环境中不发送错误到Sentry
  beforeSend(event) {
    if (process.env.NODE_ENV !== "production") {
      return null;
    }
    return event;
  },

  // 配置
  normalizeDepth: 5,
  maxBreadcrumbs: 50,
  debug: process.env.NODE_ENV !== "production",
});
