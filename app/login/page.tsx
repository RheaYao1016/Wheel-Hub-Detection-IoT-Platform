"use client";

import Link from "next/link";
import { Suspense, type FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  const { text, t } = useLocale();
  const [mode, setMode] = useState<"login" | "reg">("login");
  const [role, setRole] = useState<UserRole>("admin");
  const [message, setMessage] = useState(t("pages.login.copy001"));
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
        label: t("pages.login.copy002"),
        note: t("pages.login.copy003"),
      },
      {
        value: "engineer" as UserRole,
        label: t("pages.login.enhancedloginpage.copy013"),
        note: t("pages.login.copy004"),
      },
      {
        value: "operator" as UserRole,
        label: t("pages.admin.inspections.copy004"),
        note: t("pages.login.copy005"),
      },
      {
        value: "viewer" as UserRole,
        label: t("pages.login.enhancedloginpage.copy014"),
        note: t("pages.login.copy006"),
      },
    ],
    [text],
  );

  const seededAccounts = useMemo(
    () => [
      {
        username: "admin-demo",
        password: "admin123",
        role: "admin" as UserRole,
        label: t("pages.login.copy007"),
        note: t("pages.login.copy008"),
      },
      {
        username: "engineer-demo",
        password: "engineer123",
        role: "engineer" as UserRole,
        label: t("pages.login.copy009"),
        note: t("pages.login.copy010"),
      },
      {
        username: "operator-demo",
        password: "user123",
        role: "operator" as UserRole,
        label: t("pages.login.copy011"),
        note: t("pages.login.copy012"),
      },
      {
        username: "viewer-demo",
        password: "viewer123",
        role: "viewer" as UserRole,
        label: t("pages.login.copy013"),
        note: t("pages.login.copy014"),
      },
    ],
    [text],
  );

  useEffect(() => {
    setMode(params.get("mode") === "reg" ? "reg" : "login");
  }, [params]);

  useEffect(() => {
    const session = readStoredAuthSession();
    if (!session) return;
    navigateWithTransition(
      router,
      session.role === "admin"
        ? "/admin"
        : session.role === "operator"
          ? "/visualize"
          : "/workspace",
      { replace: true },
    );
  }, [router]);

  useEffect(() => {
    setMessage(t("pages.login.copy001"));
  }, [text]);

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

  const applySeededAccount = (account: (typeof seededAccounts)[number]) => {
    setMode("login");
    setRole(account.role);
    setUsername(account.username);
    setPassword(account.password);
    setMessage(t("pages.login.copy015", { p1: account.label }));
  };

  const updateRegisterField = <K extends keyof RegisterForm>(
    key: K,
    value: RegisterForm[K],
  ) => {
    setRegisterForm((current) => ({ ...current, [key]: value }));
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!username || !password) {
      setMessage(t("pages.login.copy016"));
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${getBackendApiBase()}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, role }),
      });
      const payload = (await response.json()) as LoginResponse;

      if (!response.ok || !payload.success) {
        throw new Error(
          payload.message || `Login failed with status ${response.status}.`,
        );
      }

      storeAuthSession(payload);
      broadcastAuthChange(payload.role);
      setMessage(t("pages.login.copy017", { p1: payload.displayName }));
      window.setTimeout(() => {
        navigateWithTransition(
          router,
          payload.role === "admin"
            ? "/admin"
            : payload.role === "operator"
              ? "/visualize"
              : "/workspace",
          { replace: true },
        );
      }, 220);
    } catch (error) {
      console.error("backend login failed", error);
      clearAuthSession();
      setMessage(
        error instanceof Error ? error.message : t("pages.login.copy018"),
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
    if (
      !displayName ||
      !nextUsername ||
      !email ||
      !department ||
      !nextPassword ||
      !confirmPassword
    ) {
      setMessage(t("pages.login.copy019"));
      return;
    }
    if (nextPassword.length < 6) {
      setMessage(t("pages.login.copy020"));
      return;
    }
    if (nextPassword !== confirmPassword) {
      setMessage(t("pages.login.copy021"));
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${getBackendApiBase()}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...registerForm, role }),
      });
      const payload = (await response.json()) as RegisterResponse;

      if (!response.ok || !payload.success) {
        throw new Error(
          payload.message ||
            `Account creation failed with status ${response.status}.`,
        );
      }

      setMessage(payload.message);
      setUsername(nextUsername);
      setPassword(nextPassword);
      setRegisterForm(EMPTY_REGISTER_FORM);
      setMode("login");
    } catch (error) {
      console.error("backend register failed", error);
      setMessage(
        error instanceof Error ? error.message : t("pages.login.copy022"),
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
          <span className="auth-badge">{t("pages.login.copy023")}</span>
          <h1>{t("pages.login.copy024")}</h1>
          <p>{t("pages.login.copy025")}</p>

          <div className="auth-feature-list">
            <div>
              <strong>{t("pages.login.copy026")}</strong>
              <span>{t("pages.login.copy027")}</span>
            </div>
            <div>
              <strong>{t("pages.login.copy028")}</strong>
              <span>{t("pages.login.copy029")}</span>
            </div>
            <div>
              <strong>{t("pages.login.copy030")}</strong>
              <span>{t("pages.login.copy031")}</span>
            </div>
          </div>

          <Link
            href="/platform-config"
            className="enterprise-secondary-button inline-flex w-fit items-center justify-center"
          >
            {t("pages.login.copy032")}
          </Link>

          <div className="auth-demo-grid">
            {seededAccounts.map((account) => (
              <button
                key={account.username}
                type="button"
                className="auth-demo-card"
                onClick={() => applySeededAccount(account)}
              >
                <strong>{account.label}</strong>
                <span>{account.note}</span>
                <em>
                  {account.username} / {account.password}
                </em>
              </button>
            ))}
          </div>
        </section>

        <Card className="auth-card">
          <div className="auth-tabs">
            <button
              type="button"
              className={mode === "login" ? "active" : ""}
              onClick={() => setMode("login")}
            >
              {t("pages.login.copy033")}
            </button>
            <button
              type="button"
              className={mode === "reg" ? "active" : ""}
              onClick={() => setMode("reg")}
            >
              {t("pages.login.copy034")}
            </button>
          </div>

          <div className="auth-card-copy">
            <h2>
              {mode === "login"
                ? t("pages.login.copy035")
                : t("pages.login.copy036")}
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
            <form className="auth-form" onSubmit={handleLogin}>
              <label>
                <span>{t("pages.login.copy037")}</span>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder={t("pages.login.copy038")}
                  autoComplete="username"
                />
              </label>
              <label className="auth-password">
                <span>{t("pages.login.enhancedloginpage.copy009")}</span>
                <input
                  type={showLoginPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={t("pages.login.copy039")}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword((current) => !current)}
                >
                  {showLoginPassword
                    ? t("pages.admin.data_import.copy053")
                    : t("pages.login.copy040")}
                </button>
              </label>
              <div className="auth-strength-row">
                <span>{t("pages.login.copy041")}</span>
                <div className="auth-strength-track">
                  <div
                    className={`auth-strength-fill auth-strength-${passwordScore}`}
                  />
                </div>
              </div>
              <button
                type="submit"
                className="auth-submit"
                disabled={submitting}
              >
                {submitting
                  ? t("pages.login.enhancedloginpage.copy015")
                  : t("pages.login.copy042", { p1: currentRole?.label ?? "" })}
              </button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleRegister}>
              <div className="auth-form-grid">
                <label>
                  <span>{t("pages.login.copy043")}</span>
                  <input
                    value={registerForm.displayName}
                    onChange={(event) =>
                      updateRegisterField("displayName", event.target.value)
                    }
                    placeholder={t("pages.login.copy044")}
                  />
                </label>
                <label>
                  <span>{t("pages.login.enhancedloginpage.copy007")}</span>
                  <input
                    value={registerForm.username}
                    onChange={(event) =>
                      updateRegisterField("username", event.target.value)
                    }
                    placeholder={t("pages.login.copy045")}
                    autoComplete="username"
                  />
                </label>
              </div>
              <div className="auth-form-grid">
                <label>
                  <span>{t("pages.login.copy046")}</span>
                  <input
                    value={registerForm.email}
                    onChange={(event) =>
                      updateRegisterField("email", event.target.value)
                    }
                    placeholder="name@company.com"
                    autoComplete="email"
                  />
                </label>
                <label>
                  <span>{t("pages.login.copy047")}</span>
                  <input
                    value={registerForm.department}
                    onChange={(event) =>
                      updateRegisterField("department", event.target.value)
                    }
                    placeholder={t("pages.login.copy048")}
                  />
                </label>
              </div>
              <label className="auth-password">
                <span>{t("pages.login.enhancedloginpage.copy009")}</span>
                <input
                  type={showRegisterPassword ? "text" : "password"}
                  value={registerForm.password}
                  onChange={(event) =>
                    updateRegisterField("password", event.target.value)
                  }
                  placeholder={t("pages.login.copy049")}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowRegisterPassword((current) => !current)}
                >
                  {showRegisterPassword
                    ? t("pages.admin.data_import.copy053")
                    : t("pages.login.copy040")}
                </button>
              </label>
              <label className="auth-password">
                <span>{t("pages.login.copy050")}</span>
                <input
                  type={showRegisterConfirmPassword ? "text" : "password"}
                  value={registerForm.confirmPassword}
                  onChange={(event) =>
                    updateRegisterField("confirmPassword", event.target.value)
                  }
                  placeholder={t("pages.login.copy051")}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowRegisterConfirmPassword((current) => !current)
                  }
                >
                  {showRegisterConfirmPassword
                    ? t("pages.admin.data_import.copy053")
                    : t("pages.login.copy040")}
                </button>
              </label>
              <div className="auth-strength-row">
                <span>{t("pages.login.copy041")}</span>
                <div className="auth-strength-track">
                  <div
                    className={`auth-strength-fill auth-strength-${passwordScore}`}
                  />
                </div>
              </div>
              <button
                type="submit"
                className="auth-submit"
                disabled={submitting}
              >
                {submitting
                  ? t("pages.login.copy052")
                  : t("pages.login.copy034")}
              </button>
            </form>
          )}

          <div className="auth-message">{message}</div>
        </Card>
      </div>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="auth-shell">
      <div className="loading-state">
        Loading the enterprise sign-in page...
      </div>
    </div>
  );
}
