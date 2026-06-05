"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  name?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * 全局ErrorBoundary组件
 * 捕获React组件树中的渲染错误，防止整个应用崩溃
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 将错误信息保存到state
    this.setState({
      error,
      errorInfo,
    });

    // 调用自定义错误处理回调
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 上报到错误日志系统
    this.reportError(error, errorInfo);
  }

  /**
   * 上报错误到日志系统
   */
  private reportError(error: Error, errorInfo: ErrorInfo): void {
    if (typeof window !== "undefined") {
      const errorLog = {
        type: "component_error",
        component: this.props.name || "Unknown",
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      };

      // 发送到本地存储
      try {
        const existingLogs = JSON.parse(
          localStorage.getItem("app_error_logs") || "[]"
        );
        existingLogs.push(errorLog);
        // 只保留最近100条错误日志
        if (existingLogs.length > 100) {
          existingLogs.splice(0, existingLogs.length - 100);
        }
        localStorage.setItem("app_error_logs", JSON.stringify(existingLogs));
      } catch {
        // 忽略localStorage错误
      }

      // 触发全局事件，供其他组件监听
      window.dispatchEvent(
        new CustomEvent("app:error", { detail: errorLog })
      );

      console.error(
        `[ErrorBoundary: ${this.props.name || "Unknown"}]`,
        error,
        errorInfo.componentStack
      );
    }
  }

  /**
   * 重置错误状态，尝试重新渲染
   */
  private handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      // 使用自定义fallback
      if (this.props.fallback) {
        if (typeof this.props.fallback === "function" && this.state.error) {
          return this.props.fallback(this.state.error, this.handleReset);
        }
        return this.props.fallback as ReactNode;
      }

      // 默认错误展示
      return (
        <div className="error-boundary-fallback">
          <div className="error-boundary-container">
            <div className="error-boundary-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h3 className="error-boundary-title">
              {this.props.name ? `${this.props.name} 发生错误` : "组件加载失败"}
            </h3>
            <p className="error-boundary-message">
              {this.state.error?.message || "未知错误"}
            </p>
            <button
              type="button"
              className="error-boundary-button"
              onClick={this.handleReset}
            >
              重试
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
