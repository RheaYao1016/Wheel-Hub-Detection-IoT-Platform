import * as Sentry from "@sentry/nextjs";

/**
 * 触发Sentry用户反馈弹窗
 * 在用户遇到错误时调用，允许用户提交反馈
 */
export function triggerSentryFeedback(options?: {
  title?: string;
  subtitle?: string;
  cancelButtonLabel?: string;
  submitButtonLabel?: string;
}) {
  Sentry.showReportDialog({
    title: options?.title || "报告一个问题",
    subtitle: options?.subtitle || "您的反馈将帮助我们改进系统",
    cancelButtonLabel: options?.cancelButtonLabel || "取消",
    submitButtonLabel: options?.submitButtonLabel || "提交",
  });
}

/**
 * 手动上报自定义错误到Sentry
 */
export function reportError(
  error: Error | string,
  options?: {
    level?: "fatal" | "error" | "warning" | "info" | "debug";
    tags?: Record<string, string>;
    context?: Record<string, unknown>;
    user?: {
      id?: string;
      email?: string;
      username?: string;
    };
  }
) {
  const errorObj = typeof error === "string" ? new Error(error) : error;

  // 设置用户信息（如果提供）
  if (options?.user) {
    Sentry.setUser({
      id: options.user.id,
      email: options.user.email,
      username: options.user.username,
    });
  }

  // 上报错误
  Sentry.captureException(errorObj, {
    level: options?.level || "error",
    tags: options?.tags || {},
    extra: options?.context || {},
  });
}

/**
 * 上报性能指标到Sentry
 */
export function reportPerformanceMetric(
  name: string,
  value: number,
  unit: "millisecond" | "byte" | "none" = "millisecond",
  tags?: Record<string, string>
) {
  Sentry.metrics.distribution(name, value, {
    unit,
    tags: tags || {},
  });
}

/**
 * 设置Sentry用户上下文
 */
export function setSentryUser(user: {
  id?: string;
  email?: string;
  username?: string;
  role?: string;
}) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });

  // 设置用户角色标签
  if (user.role) {
    Sentry.setTag("user_role", user.role);
  }
}

/**
 * 清除Sentry用户上下文（登出时调用）
 */
export function clearSentryUser() {
  Sentry.setUser(null);
}

/**
 * 添加面包屑（用户操作追踪）
 */
export function addBreadcrumb(
  message: string,
  category?: string,
  level?: "fatal" | "error" | "warning" | "info" | "debug"
) {
  Sentry.addBreadcrumb({
    message,
    category: category || "custom",
    level: level || "info",
    timestamp: Date.now() / 1000,
  });
}
