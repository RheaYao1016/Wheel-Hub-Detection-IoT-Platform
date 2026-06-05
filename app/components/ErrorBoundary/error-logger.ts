/**
 * API错误类型定义
 */
export interface ApiError {
  code: string;
  message: string;
  status?: number;
  url?: string;
  method?: string;
  timestamp: string;
  stack?: string;
}

/**
 * 错误日志条目
 */
export interface ErrorLog {
  id: string;
  type: "api_error" | "component_error" | "route_error" | "unhandled_error";
  error: Error | ApiError;
  context?: Record<string, unknown>;
  timestamp: string;
  url: string;
  userAgent: string;
}

/**
 * 错误日志管理器
 * 负责收集、存储和查询错误日志
 */
class ErrorLogger {
  private static instance: ErrorLogger;
  private maxLogs = 100;
  private storageKey = "app_error_logs";
  private listeners: Set<(log: ErrorLog) => void> = new Set();

  private constructor() {}

  public static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  /**
   * 记录API错误
   */
  public logApiError(
    error: Error | ApiError,
    context: {
      url: string;
      method: string;
      status?: number;
      requestData?: unknown;
    }
  ): void {
    const apiError: ApiError = {
      code: "API_ERROR",
      message: error.message,
      status: context.status,
      url: context.url,
      method: context.method,
      timestamp: new Date().toISOString(),
      stack: error.stack,
    };

    this.log({
      id: this.generateId(),
      type: "api_error",
      error: apiError,
      context: {
        url: context.url,
        method: context.method,
        status: context.status,
        requestData: context.requestData,
      },
      timestamp: apiError.timestamp,
      url: window.location.href,
      userAgent: navigator.userAgent,
    });
  }

  /**
   * 记录组件错误
   */
  public logComponentError(
    error: Error,
    context: {
      componentName: string;
      props?: unknown;
      state?: unknown;
    }
  ): void {
    this.log({
      id: this.generateId(),
      type: "component_error",
      error,
      context,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    });
  }

  /**
   * 记录路由错误
   */
  public logRouteError(error: Error, context: { route: string }): void {
    this.log({
      id: this.generateId(),
      type: "route_error",
      error,
      context,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    });
  }

  /**
   * 记录未处理的错误
   */
  public logUnhandledError(error: Error | ErrorEvent): void {
    const errorObj =
      error instanceof ErrorEvent ? error.error || new Error(error.message) : error;

    this.log({
      id: this.generateId(),
      type: "unhandled_error",
      error: errorObj,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    });
  }

  /**
   * 获取所有错误日志
   */
  public getLogs(): ErrorLog[] {
    try {
      const logs = localStorage.getItem(this.storageKey);
      return logs ? JSON.parse(logs) : [];
    } catch {
      return [];
    }
  }

  /**
   * 获取最近的错误日志
   */
  public getRecentLogs(count: number = 10): ErrorLog[] {
    const logs = this.getLogs();
    return logs.slice(-count).reverse();
  }

  /**
   * 按类型过滤错误日志
   */
  public getLogsByType(type: ErrorLog["type"]): ErrorLog[] {
    return this.getLogs().filter((log) => log.type === type);
  }

  /**
   * 清除所有错误日志
   */
  public clearLogs(): void {
    localStorage.removeItem(this.storageKey);
    this.notifyListeners({
      id: "clear",
      type: "unhandled_error",
      error: new Error("Logs cleared"),
      timestamp: new Date().toISOString(),
      url: "",
      userAgent: "",
    });
  }

  /**
   * 导出错误日志为JSON
   */
  public exportLogs(): string {
    return JSON.stringify(this.getLogs(), null, 2);
  }

  /**
   * 监听新错误
   */
  public subscribe(listener: (log: ErrorLog) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * 获取错误统计信息
   */
  public getStats(): {
    total: number;
    byType: Record<ErrorLog["type"], number>;
    recentCount: number;
  } {
    const logs = this.getLogs();
    const byType = {
      api_error: 0,
      component_error: 0,
      route_error: 0,
      unhandled_error: 0,
    };

    logs.forEach((log) => {
      byType[log.type]++;
    });

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const recentCount = logs.filter((log) => log.timestamp > oneHourAgo).length;

    return {
      total: logs.length,
      byType,
      recentCount,
    };
  }

  /**
   * 内部日志记录方法
   */
  private log(log: ErrorLog): void {
    try {
      const logs = this.getLogs();
      logs.push(log);

      // 保持日志数量在限制内
      if (logs.length > this.maxLogs) {
        logs.splice(0, logs.length - this.maxLogs);
      }

      localStorage.setItem(this.storageKey, JSON.stringify(logs));

      // 通知订阅者
      this.notifyListeners(log);
    } catch {
      // 忽略localStorage错误
    }
  }

  /**
   * 通知所有订阅者
   */
  private notifyListeners(log: ErrorLog): void {
    this.listeners.forEach((listener) => {
      try {
        listener(log);
      } catch {
        // 忽略监听器错误
      }
    });
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// 导出单例实例
export const errorLogger = ErrorLogger.getInstance();

// 导出默认实例
export default errorLogger;
