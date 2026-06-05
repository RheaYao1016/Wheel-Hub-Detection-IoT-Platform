"use client";

import Link from "next/link";
import { Suspense, type FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Card from "../components/Layout/Card";
import {
  broadcastAuthChange,
  clearAuthSession,
  readStoredAuthSession,
  storeAuthSession,
} from "@/lib/auth-session";
import { getBackendApiBase } from "@/lib/dashboard-client";
import { navigateWithTransition } from "@/lib/navigation-transition";
import { useLocale } from "@/app/components/Locale/LocaleProvider";
import type { LoginResponse, RegisterResponse, UserRole } from "@/types/auth";

type RegisterForm = {
  displayName: string;
  username: string;
  email: string;
  department: string;
  password: string;
  confirmPassword: string;
};

const EMPTY_REGISTER_FORM: RegisterForm = {
  displayName: "",
  username: "",
  email: "",
  department: "",
  password: "",
  confirmPassword: "",
};

const DEMO_ENABLED = process.env.NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS === "true";

type DemoAccount = {
  username: string;
  password: string;
  role: UserRole;
  labelKey: string;
  noteKey: string;
};

function getDemoAccounts(): DemoAccount[] {
  if (!DEMO_ENABLED) return [];
  return [
    {
      username: "admin-demo",
      password: "admin123",
      role: "admin" as UserRole,
      labelKey: "login.demoAdminLabel",
      noteKey: "login.demoAdminNote",
    },
    {
      username: "engineer-demo",
      password: "engineer123",
      role: "engineer" as UserRole,
      labelKey: "login.demoEngineerLabel",
      noteKey: "login.demoEngineerNote",
    },
    {
      username: "operator-demo",
      password: "user123",
      role: "operator" as UserRole,
      labelKey: "login.demoOperatorLabel",
      noteKey: "login.demoOperatorNote",
    },
    {
      username: "viewer-demo",
      password: "viewer123",
      role: "viewer" as UserRole,
      labelKey: "login.demoViewerLabel",
      noteKey: "login.demoViewerNote",
    },
  ];
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { t } = useLocale();
  const [mode, setMode] = useState<"login" | "reg">("login");
  const [role, setRole] = useState<UserRole>("admin");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [registerForm, setRegisterForm] =
    useState<RegisterForm>(EMPTY_REGISTER_FORM);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] =
    useState(false);

  const roleOptions = useMemo(
    () => [
      {
        value: "admin" as UserRole,
        label: t("login.roleAdmin"),
        note: t("login.roleAdminNote"),
      },
      {
        value: "engineer" as UserRole,
        label: t("login.roleEngineer"),
        note: t("login.roleEngineerNote"),
      },
      {
        value: "operator" as UserRole,
        label: t("login.roleOperator"),
        note: t("login.roleOperatorNote"),
      },
      {
        value: "viewer" as UserRole,
        label: t("login.roleViewer"),
        note: t("login.roleViewerNote"),
      },
    ],
    [t],
  );

  const seededAccounts = useMemo(
    () => getDemoAccounts(),
    [],
  );

  const translatedDemoAccounts = useMemo(
    () =>
      seededAccounts.map((account) => ({
        ...account,
        label: t(account.labelKey),
        note: t(account.noteKey),
      })),
    [seededAccounts, t],
  );

  useEffect(() => {
    setMode(params.get("mode") === "reg" ? "reg" : "login");
  }, [params]);

  useEffect(() => {
    setMessage(t("login.welcomeMessage"));
  }, [t]);

  useEffect(() => {
    const session = readStoredAuthSession();
    if (!session) return;
    if (hasExpired(session.expiresAt)) {
      clearAuthSession();
      return;
    }
    navigateWithTransition(
      router,
      getRoleRedirect(session.role),
      { replace: true },
    );
  }, [router]);

  const currentRole = useMemo(
    () => roleOptions.find((item) => item.value === role),
    [roleOptions, role],
  );

  const passwordScore = useMemo(() => {
    const value = mode === "login" ? password : registerForm.password;
    let score = 0;
    if (value.length >= 6) score += 1;
    if (/[A-Z]/.test(value) || /[a-z]/.test(value)) score += 1;
    if (/\d/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value)) score += 1;
    return score;
  }, [mode, password, registerForm.password]);

  const applySeededAccount = (account: (typeof translatedDemoAccounts)[number]) => {
    setMode("login");
    setRole(account.role);
    setUsername(account.username);
    setPassword(account.password);
    setMessage(t("login.demoAccountSelected", { p1: account.label }));
  };

  const updateRegisterField = <K extends keyof RegisterForm>(
    key: K,
    value: RegisterForm[K],
  ) => {
    setRegisterForm((current) => ({ ...current, [key]: value }));
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!username.trim() || !password) {
      setMessage(t("login.enterUsernamePassword"));
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${getBackendApiBase()}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password, role }),
      });
      const payload = (await response.json()) as LoginResponse;

      if (!response.ok || !payload.success) {
        throw new Error(
          payload.message || `Login failed with status ${response.status}.`,
        );
      }

      storeAuthSession(payload);
      broadcastAuthChange(payload.role);
      setMessage(t("login.welcomeBack", { p1: payload.displayName }));
      window.setTimeout(() => {
        navigateWithTransition(
          router,
          getRoleRedirect(payload.role),
          { replace: true },
        );
      }, 220);
    } catch (error) {
      console.error("backend login failed", error);
      clearAuthSession();
      setMessage(
        error instanceof Error ? error.message : t("login.loginFailed"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const {
      displayName,
      username: nextUsername,
      email,
      department,
      password: nextPassword,
      confirmPassword,
    } = registerForm;
    
    if (!displayName.trim() || !nextUsername.trim() || !email.trim() || !department.trim() || !nextPassword || !confirmPassword) {
      setMessage(t("login.fillComplete"));
      return;
    }
    
    if (nextPassword.length < 6) {
      setMessage(t("login.passwordMinLength"));
      return;
    }
    
    if (nextPassword !== confirmPassword) {
      setMessage(t("login.passwordMismatch"));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setMessage(t("login.invalidEmail"));
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${getBackendApiBase()}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          username: nextUsername.trim(),
          email: email.trim(),
          department: department.trim(),
          password: nextPassword,
          confirmPassword,
          role,
        }),
      });
      const payload = (await response.json()) as RegisterResponse;

      if (!response.ok || !payload.success) {
        throw new Error(
          payload.message ||
            `Account creation failed with status ${response.status}.`,
        );
      }

      setMessage(payload.message);
      setUsername(nextUsername.trim());
      setPassword(nextPassword);
      setRegisterForm(EMPTY_REGISTER_FORM);
      setMode("login");
    } catch (error) {
      console.error("backend register failed", error);
      setMessage(
        error instanceof Error ? error.message : t("login.registerFailed"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-backdrop" aria-hidden />
      <div className="auth-grid">
        <section className="auth-story">
          <span className="auth-badge">{t("login.badge")}</span>
          <h1>{t("login.title")}</h1>
          <p>{t("login.subtitle")}</p>

          <div className="auth-feature-list">
            <div>
              <strong>{t("login.feature.monitoring")}</strong>
              <span>{t("login.feature.monitoringDesc")}</span>
            </div>
            <div>
              <strong>{t("login.feature.alerts")}</strong>
              <span>{t("login.feature.alertsDesc")}</span>
            </div>
            <div>
              <strong>{t("login.feature.ai")}</strong>
              <span>{t("login.feature.aiDesc")}</span>
            </div>
          </div>

          <Link
            href="/platform-config"
            className="enterprise-secondary-button inline-flex w-fit items-center justify-center"
          >
            {t("login.platformConfig")}
          </Link>

          {translatedDemoAccounts.length > 0 && (
            <div className="auth-demo-grid">
              {translatedDemoAccounts.map((account) => (
                <button
                  key={account.username}
                  type="button"
                  className="auth-demo-card"
                  onClick={() => applySeededAccount(account)}
                  aria-label={t("login.demoSelect", { p1: account.label })}
                >
                  <strong>{account.label}</strong>
                  <span>{account.note}</span>
                  <em className="demo-credentials">
                    {account.username} / {"•".repeat(account.password.length)}
                  </em>
                </button>
              ))}
            </div>
          )}
        </section>

        <Card className="auth-card">
          <div className="auth-tabs">
            <button
              type="button"
              className={mode === "login" ? "active" : ""}
              onClick={() => setMode("login")}
            >
              {t("login.tabLogin")}
            </button>
            <button
              type="button"
              className={mode === "reg" ? "active" : ""}
              onClick={() => setMode("reg")}
            >
              {t("login.tabRegister")}
            </button>
          </div>

          <div className="auth-card-copy">
            <h2>
              {mode === "login"
                ? t("login.signIn")
                : t("login.createAccount")}
            </h2>
            <p>{currentRole?.note}</p>
          </div>

          <div className="auth-role-grid">
            {roleOptions.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`auth-role-card ${role === item.value ? "auth-role-card-active" : ""}`}
                onClick={() => setRole(item.value)}
              >
                <strong>{item.label}</strong>
                <span>{item.note}</span>
              </button>
            ))}
          </div>

          {mode === "login" ? (
            <form className="auth-form" onSubmit={handleLogin} noValidate>
              <label>
                <span>{t("login.labelUsername")}</span>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder={t("login.placeholderUsername")}
                  autoComplete="username"
                  required
                  minLength={3}
                />
              </label>
              <label className="auth-password">
                <span>{t("login.labelPassword")}</span>
                <input
                  type={showLoginPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={t("login.placeholderPassword")}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword((current) => !current)}
                  aria-label={showLoginPassword ? t("login.hidePassword") : t("login.showPassword")}
                >
                  {showLoginPassword
                    ? t("login.hideShort")
                    : t("login.showShort")}
                </button>
              </label>
              <div className="auth-strength-row">
                <span>{t("login.passwordStrength")}</span>
                <div className="auth-strength-track">
                  <div
                    className={`auth-strength-fill auth-strength-${passwordScore}`}
                    role="progressbar"
                    aria-valuenow={passwordScore}
                    aria-valuemin={0}
                    aria-valuemax={4}
                  />
                </div>
              </div>
              <button
                type="submit"
                className="auth-submit"
                disabled={submitting || !username.trim() || !password}
              >
                {submitting
                  ? t("login.signingIn")
                  : `${t("login.signInAs")} ${currentRole?.label ?? ""}`}
              </button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleRegister} noValidate>
              <div className="auth-form-grid">
                <label>
                  <span>{t("login.labelDisplayName")}</span>
                  <input
                    value={registerForm.displayName}
                    onChange={(event) =>
                      updateRegisterField("displayName", event.target.value)
                    }
                    placeholder={t("login.placeholderDisplayName")}
                    required
                    maxLength={50}
                  />
                </label>
                <label>
                  <span>{t("login.labelUsername")}</span>
                  <input
                    value={registerForm.username}
                    onChange={(event) =>
                      updateRegisterField("username", event.target.value)
                    }
                    placeholder={t("login.placeholderLoginUsername")}
                    autoComplete="username"
                    required
                    minLength={3}
                    maxLength={30}
                  />
                </label>
              </div>
              <div className="auth-form-grid">
                <label>
                  <span>{t("login.labelEmail")}</span>
                  <input
                    type="email"
                    value={registerForm.email}
                    onChange={(event) =>
                      updateRegisterField("email", event.target.value)
                    }
                    placeholder={t("login.placeholderEmail")}
                    autoComplete="email"
                    required
                    maxLength={100}
                  />
                </label>
                <label>
                  <span>{t("login.labelDepartment")}</span>
                  <input
                    value={registerForm.department}
                    onChange={(event) =>
                      updateRegisterField("department", event.target.value)
                    }
                    placeholder={t("login.placeholderDepartment")}
                    required
                    maxLength={50}
                  />
                </label>
              </div>
              <label className="auth-password">
                <span>{t("login.labelPassword")}</span>
                <input
                  type={showRegisterPassword ? "text" : "password"}
                  value={registerForm.password}
                  onChange={(event) =>
                    updateRegisterField("password", event.target.value)
                  }
                  placeholder={t("login.placeholderSetPassword")}
                  autoComplete="new-password"
                  required
                  minLength={6}
                  maxLength={100}
                />
                <button
                  type="button"
                  onClick={() => setShowRegisterPassword((current) => !current)}
                  aria-label={showRegisterPassword ? t("login.hidePassword") : t("login.showPassword")}
                >
                  {showRegisterPassword
                    ? t("login.hideShort")
                    : t("login.showShort")}
                </button>
              </label>
              <label className="auth-password">
                <span>{t("login.labelConfirmPassword")}</span>
                <input
                  type={showRegisterConfirmPassword ? "text" : "password"}
                  value={registerForm.confirmPassword}
                  onChange={(event) =>
                    updateRegisterField("confirmPassword", event.target.value)
                  }
                  placeholder={t("login.placeholderConfirmPassword")}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowRegisterConfirmPassword((current) => !current)
                  }
                  aria-label={showRegisterConfirmPassword ? t("login.hidePassword") : t("login.showPassword")}
                >
                  {showRegisterConfirmPassword
                    ? t("login.hideShort")
                    : t("login.showShort")}
                </button>
              </label>
              <div className="auth-strength-row">
                <span>{t("login.passwordStrength")}</span>
                <div className="auth-strength-track">
                  <div
                    className={`auth-strength-fill auth-strength-${passwordScore}`}
                    role="progressbar"
                    aria-valuenow={passwordScore}
                    aria-valuemin={0}
                    aria-valuemax={4}
                  />
                </div>
              </div>
              <button
                type="submit"
                className="auth-submit"
                disabled={submitting}
              >
                {submitting
                  ? t("login.creatingAccount")
                  : t("login.register")}
              </button>
            </form>
          )}

          {message && (
            <div className={`auth-message ${message.includes("失败") || message.includes("failed") || message.includes("错误") || message.includes("错误") || message.includes("不一致") || message.includes("无效") || message.includes("锁定") ? "auth-message-error" : "auth-message-success"}`} role="alert">
              {message}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function getRoleRedirect(role: UserRole): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "operator":
      return "/visualize";
    case "engineer":
      return "/workspace";
    case "viewer":
      return "/home";
    default:
      return "/home";
  }
}

function hasExpired(expiresAt?: string): boolean {
  if (!expiresAt) return true;
  const parsed = Date.parse(expiresAt);
  if (Number.isNaN(parsed)) return true;
  return parsed <= Date.now();
}

function LoginFallback() {
  const { t } = useLocale();
  return (
    <div className="auth-shell">
      <div className="loading-state">
        <div className="loading-spinner" aria-hidden />
        <span>{t("login.loading")}</span>
      </div>
    </div>
  );
}
