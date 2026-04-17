"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Card from "../components/Layout/Card";
import { useLocale } from "../components/Locale/LocaleProvider";
import {
  broadcastAuthChange,
  clearAuthSession,
  readStoredAuthSession,
  storeAuthSession,
} from "@/lib/auth-session";
import { getBackendApiBase } from "@/lib/dashboard-client";
import { navigateWithTransition } from "@/lib/navigation-transition";
import type { LoginResponse, UserRole } from "@/types/auth";

const AURORA_GRADIENT = {
  background: "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",
  accent: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  glass: "rgba(255, 255, 255, 0.05)",
  glassBorder: "rgba(255, 255, 255, 0.1)",
};

const MOTION_CONFIG = {
  duration: { fast: "150ms", normal: "250ms", slow: "400ms" },
  easing: {
    smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
    bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
  },
};

type DemoAccount = {
  username: string;
  password: string;
  role: UserRole;
  labelKey: string;
  icon: string;
};

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    username: "admin-demo",
    password: "admin123",
    role: "admin",
    labelKey: "pages.login.demoAccount.admin",
    icon: "🛡️",
  },
  {
    username: "engineer-demo",
    password: "engineer123",
    role: "engineer",
    labelKey: "pages.login.demoAccount.engineer",
    icon: "⚙️",
  },
  {
    username: "operator-demo",
    password: "user123",
    role: "operator",
    labelKey: "pages.login.demoAccount.operator",
    icon: "📊",
  },
  {
    username: "viewer-demo",
    password: "viewer123",
    role: "viewer",
    labelKey: "pages.login.demoAccount.viewer",
    icon: "👁️",
  },
];

export default function EnhancedLoginPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    content: string;
  } | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>("admin");
  const [isMounted, setIsMounted] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
    const session = readStoredAuthSession();
    if (session) {
      navigateWithTransition(
        router,
        session.role === "admin" ? "/admin" : "/workspace",
        { replace: true },
      );
    }
  }, [router]);

  const handleDemoAccountClick = (account: DemoAccount) => {
    setUsername(account.username);
    setPassword(account.password);
    setSelectedRole(account.role);
    setMessage({
      type: "info",
      content: t("pages.login.enhancedloginpage.copy001", {
        p1: t(account.labelKey),
      }),
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setMessage({
        type: "error",
        content: t("pages.login.enhancedloginpage.copy002"),
      });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`${getBackendApiBase()}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, role: selectedRole }),
      });

      const payload = (await response.json()) as LoginResponse;

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Login failed");
      }

      storeAuthSession(payload);
      broadcastAuthChange(payload.role);

      setMessage({
        type: "success",
        content: t("pages.login.enhancedloginpage.copy003", {
          p1: payload.displayName,
        }),
      });

      setTimeout(() => {
        navigateWithTransition(
          router,
          payload.role === "admin" ? "/admin" : "/workspace",
          { replace: true },
        );
      }, 1000);
    } catch (error) {
      console.error("Login error:", error);
      clearAuthSession();
      setMessage({
        type: "error",
        content:
          error instanceof Error
            ? error.message
            : t("pages.login.enhancedloginpage.copy004"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isMounted) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: AURORA_GRADIENT.background,
        }}
      >
        <div
          style={{
            width: "48px",
            height: "48px",
            border: "3px solid rgba(102, 126, 234, 0.3)",
            borderTopColor: "#667eea",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: AURORA_GRADIENT.background,
        padding: "20px",
        position: "relative",
        overflow: "hidden",
        fontFamily:
          "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <style jsx global>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }
        @keyframes pulse-glow {
          0%,
          100% {
            box-shadow: 0 0 20px rgba(102, 126, 234, 0.3);
          }
          50% {
            box-shadow: 0 0 40px rgba(118, 75, 162, 0.5);
          }
        }
        @keyframes shimmer {
          0% {
            background-position: -200% center;
          }
          100% {
            background-position: 200% center;
          }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .aurora-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.6;
          animation: float 8s ease-in-out infinite;
        }
        .glass-card {
          background: rgba(15, 32, 39, 0.8);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        .input-field {
          transition: all ${MOTION_CONFIG.duration.normal}
            ${MOTION_CONFIG.easing.smooth};
        }
        .input-field:focus {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px -10px rgba(102, 126, 234, 0.5);
        }
        .demo-card {
          transition: all ${MOTION_CONFIG.duration.normal}
            ${MOTION_CONFIG.easing.smooth};
        }
        .demo-card:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 15px 35px -10px rgba(102, 126, 234, 0.4);
        }
        .submit-button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          transition: all ${MOTION_CONFIG.duration.normal}
            ${MOTION_CONFIG.easing.smooth};
          position: relative;
          overflow: hidden;
        }
        .submit-button::before {
          content: "";
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.2),
            transparent
          );
          transition: left ${MOTION_CONFIG.duration.slow};
        }
        .submit-button:hover::before {
          left: 100%;
        }
        .submit-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 35px -10px rgba(102, 126, 234, 0.6);
        }
        .submit-button:active {
          transform: translateY(0);
        }
        .message-toast {
          animation: slideUp ${MOTION_CONFIG.duration.normal}
            ${MOTION_CONFIG.easing.bounce};
        }
      `}</style>

      <div
        className="aurora-blob"
        style={{
          width: "400px",
          height: "400px",
          background:
            "radial-gradient(circle, rgba(102, 126, 234, 0.4) 0%, transparent 70%)",
          top: "-100px",
          right: "-100px",
          animationDelay: "0s",
        }}
      />
      <div
        className="aurora-blob"
        style={{
          width: "350px",
          height: "350px",
          background:
            "radial-gradient(circle, rgba(118, 75, 162, 0.4) 0%, transparent 70%)",
          bottom: "-80px",
          left: "-80px",
          animationDelay: "-4s",
        }}
      />
      <div
        className="aurora-blob"
        style={{
          width: "300px",
          height: "300px",
          background:
            "radial-gradient(circle, rgba(44, 83, 100, 0.3) 0%, transparent 70%)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          animationDelay: "-2s",
        }}
      />

      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          position: "relative",
          zIndex: 1,
          animation: "slideUp 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <Card
          className="glass-card"
          style={{
            borderRadius: "24px",
            padding: "48px 40px",
            animation: "pulse-glow 4s ease-in-out infinite",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <div
              style={{
                width: "80px",
                height: "80px",
                margin: "0 auto 24px",
                borderRadius: "20px",
                background: AURORA_GRADIENT.accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "36px",
                boxShadow: "0 15px 35px -10px rgba(102, 126, 234, 0.5)",
              }}
            >
              🏭
            </div>
            <h1
              style={{
                fontSize: "28px",
                fontWeight: "700",
                color: "#ffffff",
                margin: "0 0 8px 0",
                letterSpacing: "-0.02em",
              }}
            >
              {t("pages.login.enhancedloginpage.copy005")}
            </h1>
            <p
              style={{
                fontSize: "15px",
                color: "rgba(255, 255, 255, 0.6)",
                margin: 0,
                lineHeight: "1.5",
              }}
            >
              {t("pages.login.enhancedloginpage.copy006")}
            </p>
          </div>

          {message && (
            <div
              className="message-toast"
              style={{
                padding: "14px 18px",
                borderRadius: "12px",
                marginBottom: "24px",
                fontSize: "14px",
                fontWeight: "500",
                backgroundColor:
                  message.type === "success"
                    ? "rgba(16, 185, 129, 0.15)"
                    : message.type === "error"
                      ? "rgba(239, 68, 68, 0.15)"
                      : "rgba(59, 130, 246, 0.15)",
                color:
                  message.type === "success"
                    ? "#10b981"
                    : message.type === "error"
                      ? "#ef4444"
                      : "#3b82f6",
                border: `1px solid ${
                  message.type === "success"
                    ? "rgba(16, 185, 129, 0.3)"
                    : message.type === "error"
                      ? "rgba(239, 68, 68, 0.3)"
                      : "rgba(59, 130, 246, 0.3)"
                }`,
              }}
            >
              {message.content}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "20px" }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "rgba(255, 255, 255, 0.8)",
                  marginBottom: "8px",
                  letterSpacing: "0.03em",
                  textTransform: "uppercase",
                }}
              >
                {t("pages.login.enhancedloginpage.copy007")}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t("pages.login.enhancedloginpage.copy008")}
                className="input-field"
                onFocus={() => setFocusedField("username")}
                onBlur={() => setFocusedField(null)}
                style={{
                  width: "100%",
                  padding: "14px 18px",
                  borderRadius: "12px",
                  border: `2px solid ${
                    focusedField === "username"
                      ? "rgba(102, 126, 234, 0.6)"
                      : "rgba(255, 255, 255, 0.1)"
                  }`,
                  background: "rgba(255, 255, 255, 0.05)",
                  color: "#ffffff",
                  fontSize: "15px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "rgba(255, 255, 255, 0.8)",
                  marginBottom: "8px",
                  letterSpacing: "0.03em",
                  textTransform: "uppercase",
                }}
              >
                {t("pages.login.enhancedloginpage.copy009")}
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("pages.login.enhancedloginpage.copy010")}
                  className="input-field"
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  style={{
                    width: "100%",
                    padding: "14px 50px 14px 18px",
                    borderRadius: "12px",
                    border: `2px solid ${
                      focusedField === "password"
                        ? "rgba(102, 126, 234, 0.6)"
                        : "rgba(255, 255, 255, 0.1)"
                    }`,
                    background: "rgba(255, 255, 255, 0.05)",
                    color: "#ffffff",
                    fontSize: "15px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "rgba(255, 255, 255, 0.6)",
                    cursor: "pointer",
                    fontSize: "18px",
                    padding: "4px",
                  }}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "rgba(255, 255, 255, 0.8)",
                  marginBottom: "12px",
                  letterSpacing: "0.03em",
                  textTransform: "uppercase",
                }}
              >
                {t("pages.login.enhancedloginpage.copy011")}
              </label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: "10px",
                }}
              >
                {[
                  {
                    value: "admin" as UserRole,
                    label: t("pages.login.enhancedloginpage.copy012"),
                    emoji: "🛡️",
                  },
                  {
                    value: "engineer" as UserRole,
                    label: t("pages.login.enhancedloginpage.copy013"),
                    emoji: "⚙️",
                  },
                  {
                    value: "operator" as UserRole,
                    label: t("pages.admin.inspections.copy004"),
                    emoji: "📊",
                  },
                  {
                    value: "viewer" as UserRole,
                    label: t("pages.login.enhancedloginpage.copy014"),
                    emoji: "👁️",
                  },
                ].map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => setSelectedRole(role.value)}
                    style={{
                      padding: "12px 16px",
                      borderRadius: "10px",
                      border: `2px solid ${
                        selectedRole === role.value
                          ? "rgba(102, 126, 234, 0.6)"
                          : "rgba(255, 255, 255, 0.1)"
                      }`,
                      background:
                        selectedRole === role.value
                          ? "rgba(102, 126, 234, 0.15)"
                          : "rgba(255, 255, 255, 0.03)",
                      color: "#ffffff",
                      fontSize: "14px",
                      fontWeight: "500",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span>{role.emoji}</span>
                    {role.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="submit-button"
              style={{
                width: "100%",
                padding: "16px 24px",
                borderRadius: "12px",
                border: "none",
                color: "#ffffff",
                fontSize: "16px",
                fontWeight: "600",
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading ? 0.7 : 1,
                letterSpacing: "0.02em",
                marginTop: "8px",
              }}
            >
              {isLoading ? (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                  }}
                >
                  <span
                    style={{
                      width: "20px",
                      height: "20px",
                      border: "2px solid rgba(255, 255, 255, 0.3)",
                      borderTopColor: "#ffffff",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear inline",
                    }}
                  />
                  {t("pages.login.enhancedloginpage.copy015")}
                </span>
              ) : (
                t("pages.login.enhancedloginpage.copy016")
              )}
            </button>
          </form>

          <div
            style={{
              marginTop: "32px",
              paddingTop: "24px",
              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <p
              style={{
                fontSize: "13px",
                color: "rgba(255, 255, 255, 0.5)",
                textAlign: "center",
                marginBottom: "16px",
                fontWeight: "500",
              }}
            >
              {t("pages.login.enhancedloginpage.copy017")}
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "10px",
              }}
            >
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.username}
                  type="button"
                  onClick={() => handleDemoAccountClick(account)}
                  className="demo-card"
                  style={{
                    padding: "12px 14px",
                    borderRadius: "10px",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    background: "rgba(255, 255, 255, 0.03)",
                    color: "rgba(255, 255, 255, 0.8)",
                    fontSize: "13px",
                    cursor: "pointer",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <span style={{ fontSize: "20px" }}>{account.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontWeight: "600",
                        fontSize: "13px",
                        marginBottom: "2px",
                      }}
                    >
                      {t(account.labelKey)}
                    </div>
                    <div style={{ fontSize: "11px", opacity: 0.6 }}>
                      {account.username}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div
            style={{
              marginTop: "24px",
              textAlign: "center",
            }}
          >
            <Link
              href="/platform-config"
              style={{
                color: "rgba(102, 126, 234, 0.8)",
                fontSize: "13px",
                textDecoration: "none",
                fontWeight: "500",
                transition: "color 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#667eea";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "rgba(102, 126, 234, 0.8)";
              }}
            >
              {t("pages.login.enhancedloginpage.copy018")}
            </Link>
          </div>
        </Card>

        <p
          style={{
            textAlign: "center",
            marginTop: "24px",
            fontSize: "13px",
            color: "rgba(255, 255, 255, 0.4)",
          }}
        >
          {t("pages.login.enhancedloginpage.copy019")}
        </p>
      </div>
    </div>
  );
}
