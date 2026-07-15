"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { useLocale } from "../Locale/LocaleProvider";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
};

export default class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[GlobalErrorBoundary] Caught an error:", error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    if (typeof window !== "undefined") {
      const errorLog = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      };

      try {
        const existingErrors = JSON.parse(
          localStorage.getItem("error_logs") || "[]"
        );
        existingErrors.push(errorLog);
        localStorage.setItem(
          "error_logs",
          JSON.stringify(existingErrors.slice(-50))
        );
      } catch (e) {
        console.error("[GlobalErrorBoundary] Failed to save error log:", e);
      }
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  handleGoHome = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback 
        error={this.state.error} 
        onReset={this.handleReset}
        onGoHome={this.handleGoHome}
      />;
    }

    return this.props.children;
  }
}

function ErrorFallback({
  error,
  onReset,
  onGoHome
}: {
  error: Error | null;
  onReset: () => void;
  onGoHome: () => void;
}) {
  const { t } = useLocale();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",
        padding: "20px",
        fontFamily:
          "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "560px",
          width: "100%",
          background: "rgba(15, 32, 39, 0.9)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "24px",
          padding: "48px 40px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "80px",
            height: "80px",
            margin: "0 auto 24px",
            borderRadius: "20px",
            background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 15px 35px -10px rgba(239, 68, 68, 0.5)",
          }}
        >
          <AlertTriangle style={{ width: 40, height: 40, color: "#fff" }} />
        </div>

        <h1
          style={{
            fontSize: "28px",
            fontWeight: "700",
            color: "#ffffff",
            margin: "0 0 12px 0",
            letterSpacing: "-0.02em",
          }}
        >
          {t("error.title", undefined, "Application Error")}
        </h1>

        <p
          style={{
            fontSize: "15px",
            color: "rgba(255, 255, 255, 0.6)",
            margin: "0 0 24px 0",
            lineHeight: "1.6",
          }}
        >
          {t(
            "error.description",
            undefined,
            "Sorry, the application encountered an unexpected error. This may be caused by an unstable network connection, temporarily unavailable backend services, or a transient issue while loading the page."
          )}
        </p>

        {error && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "12px",
              padding: "16px",
              marginBottom: "24px",
              textAlign: "left",
            }}
          >
            <p
              style={{
                fontSize: "13px",
                color: "#fca5a5",
                margin: "0 0 8px 0",
                fontWeight: "600",
                fontFamily: "monospace",
              }}
            >
              {error.name}: {error.message}
            </p>
            {process.env.NODE_ENV === "development" && error.stack && (
              <pre
                style={{
                  fontSize: "11px",
                  color: "#fca5a5",
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  maxHeight: "200px",
                  overflowY: "auto",
                  opacity: 0.8,
                }}
              >
                {error.stack}
              </pre>
            )}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: "12px",
            justifyContent: "center",
          }}
        >
          <button
            onClick={onReset}
            style={{
              flex: 1,
              padding: "14px 24px",
              borderRadius: "12px",
              border: "none",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "#ffffff",
              fontSize: "15px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow =
                "0 15px 35px -10px rgba(102, 126, 234, 0.6)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <RefreshCw style={{ width: 18, height: 18 }} />
            {t("error.reload", undefined, "Reload")}
          </button>

          <button
            onClick={onGoHome}
            style={{
              flex: 1,
              padding: "14px 24px",
              borderRadius: "12px",
              border: "2px solid rgba(255, 255, 255, 0.2)",
              background: "rgba(255, 255, 255, 0.05)",
              color: "#ffffff",
              fontSize: "15px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 05)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
            }}
          >
            <Home style={{ width: 18, height: 18 }} />
            {t("error.goHome", undefined, "Go Home")}
          </button>
        </div>

        <p
          style={{
            marginTop: "24px",
            fontSize: "12px",
            color: "rgba(255, 255, 255, 0.4)",
            margin: 0,
          }}
        >
          {t(
            "error.footer",
            undefined,
            "If this issue persists, please contact technical support or check the backend service status."
          )}
        </p>
      </div>
    </div>
  );
}
