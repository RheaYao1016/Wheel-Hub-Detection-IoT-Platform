"use client";

import { useState, useEffect, useCallback } from "react";
import { errorLogger, type ErrorLog } from "./error-logger";

interface ErrorLogViewerProps {
  className?: string;
  maxLogs?: number;
  showExport?: boolean;
  showClear?: boolean;
}

/**
 * 错误日志展示组件
 * 用于在开发环境或管理界面中查看错误日志
 */
export default function ErrorLogViewer({
  className = "",
  maxLogs = 20,
  showExport = true,
  showClear = true,
}: ErrorLogViewerProps) {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ErrorLog | null>(null);

  // 加载日志
  useEffect(() => {
    setLogs(errorLogger.getRecentLogs(maxLogs));
  }, [maxLogs]);

  // 监听新错误
  useEffect(() => {
    const unsubscribe = errorLogger.subscribe((log) => {
      setLogs((prev) => [log, ...prev].slice(0, maxLogs));
    });

    return unsubscribe;
  }, [maxLogs]);

  // 导出日志
  const handleExport = useCallback(() => {
    const data = errorLogger.exportLogs();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `error-logs-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // 清除日志
  const handleClear = useCallback(() => {
    if (window.confirm("确定要清除所有错误日志吗？")) {
      errorLogger.clearLogs();
      setLogs([]);
    }
  }, []);

  // 获取错误类型标签
  const getTypeLabel = (type: ErrorLog["type"]) => {
    const labels = {
      api_error: "API错误",
      component_error: "组件错误",
      route_error: "路由错误",
      unhandled_error: "未处理错误",
    };
    return labels[type] || type;
  };

  // 获取错误类型颜色
  const getTypeColor = (type: ErrorLog["type"]) => {
    const colors = {
      api_error: "#ff6b6b",
      component_error: "#ffa502",
      route_error: "#70a1ff",
      unhandled_error: "#ff4757",
    };
    return colors[type] || "#666";
  };

  // 格式化时间
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return "刚刚";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return date.toLocaleString("zh-CN");
  };

  return (
    <div className={`error-log-viewer ${className}`}>
      {/* 浮动按钮 */}
      {!isOpen && (
        <button
          type="button"
          className="error-log-toggle"
          onClick={() => setIsOpen(true)}
          title="查看错误日志"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          {logs.length > 0 && (
            <span className="error-log-badge">{logs.length}</span>
          )}
        </button>
      )}

      {/* 日志面板 */}
      {isOpen && (
        <div className="error-log-panel">
          <div className="error-log-header">
            <h3 className="error-log-title">
              错误日志 ({logs.length})
            </h3>
            <div className="error-log-actions">
              {showExport && (
                <button
                  type="button"
                  className="error-log-action-btn"
                  onClick={handleExport}
                  disabled={logs.length === 0}
                >
                  导出
                </button>
              )}
              {showClear && (
                <button
                  type="button"
                  className="error-log-action-btn danger"
                  onClick={handleClear}
                  disabled={logs.length === 0}
                >
                  清除
                </button>
              )}
              <button
                type="button"
                className="error-log-close-btn"
                onClick={() => setIsOpen(false)}
              >
                ×
              </button>
            </div>
          </div>

          <div className="error-log-list">
            {logs.length === 0 ? (
              <div className="error-log-empty">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <p>暂无错误日志</p>
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className={`error-log-item ${selectedLog?.id === log.id ? "selected" : ""}`}
                  onClick={() => setSelectedLog(log)}
                >
                  <div className="error-log-item-header">
                    <span
                      className="error-log-type"
                      style={{ backgroundColor: getTypeColor(log.type) }}
                    >
                      {getTypeLabel(log.type)}
                    </span>
                    <span className="error-log-time">
                      {formatTime(log.timestamp)}
                    </span>
                  </div>
                  <p className="error-log-message">
                    {(log.error as Error).message || "未知错误"}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* 错误详情 */}
          {selectedLog && (
            <div className="error-log-detail">
              <div className="error-log-detail-header">
                <h4>错误详情</h4>
                <button
                  type="button"
                  className="error-log-close-detail"
                  onClick={() => setSelectedLog(null)}
                >
                  ×
                </button>
              </div>
              <div className="error-log-detail-content">
                <div className="error-log-detail-field">
                  <label>错误类型</label>
                  <span>{getTypeLabel(selectedLog.type)}</span>
                </div>
                <div className="error-log-detail-field">
                  <label>错误信息</label>
                  <span>{(selectedLog.error as Error).message}</span>
                </div>
                {(selectedLog.error as Error).stack && (
                  <div className="error-log-detail-field">
                    <label>堆栈信息</label>
                    <pre>{(selectedLog.error as Error).stack}</pre>
                  </div>
                )}
                {selectedLog.context && (
                  <div className="error-log-detail-field">
                    <label>上下文信息</label>
                    <pre>{JSON.stringify(selectedLog.context, null, 2)}</pre>
                  </div>
                )}
                <div className="error-log-detail-field">
                  <label>发生时间</label>
                  <span>{new Date(selectedLog.timestamp).toLocaleString("zh-CN")}</span>
                </div>
                <div className="error-log-detail-field">
                  <label>页面URL</label>
                  <span>{selectedLog.url}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
