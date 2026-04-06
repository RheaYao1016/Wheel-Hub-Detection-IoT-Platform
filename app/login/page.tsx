"use client";

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
import type { LoginResponse, RegisterResponse, UserRole } from "@/types/auth";

const ROLE_OPTIONS: Array<{ value: UserRole; label: string; note: string }> = [
  { value: "admin", label: "Administrator", note: "Access governance, audit, imports, alerts, and enterprise configuration." },
  { value: "engineer", label: "Engineer", note: "Run analysis, annotation, model training, and data preparation workflows." },
  { value: "operator", label: "Operator", note: "Handle shop-floor execution, inspection follow-up, and operational dashboards." },
  { value: "viewer", label: "Viewer", note: "Read-only access for demos, reviews, reporting, and presentation scenarios." },
];

const SEEDED_ACCOUNTS = [
  { username: "admin-demo", password: "admin123", role: "admin" as UserRole, label: "Administrator account", note: "Open the admin console and full platform governance views." },
  { username: "engineer-demo", password: "engineer123", role: "engineer" as UserRole, label: "Engineer account", note: "Open the AI workspace, annotation, reports, and model training center." },
  { username: "operator-demo", password: "user123", role: "operator" as UserRole, label: "Operator account", note: "Open the operational overview and on-site workspace." },
  { username: "viewer-demo", password: "viewer123", role: "viewer" as UserRole, label: "Viewer account", note: "Read reports and high-level overview pages only." },
];

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
  const [mode, setMode] = useState<"login" | "reg">("login");
  const [role, setRole] = useState<UserRole>("admin");
  const [message, setMessage] = useState(
    "Sign in with a real backend account. Seeded accounts are available for review sessions, and new accounts are stored by the Spring Boot backend.",
  );
  const [submitting, setSubmitting] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [registerForm, setRegisterForm] = useState<RegisterForm>(EMPTY_REGISTER_FORM);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);

  useEffect(() => {
    setMode(params.get("mode") === "reg" ? "reg" : "login");
  }, [params]);

  useEffect(() => {
    const session = readStoredAuthSession();
    if (!session) return;
    navigateWithTransition(
      router,
      session.role === "admin" ? "/admin" : session.role === "operator" ? "/visualize" : "/workspace",
      { replace: true },
    );
  }, [router]);

  const currentRole = useMemo(() => ROLE_OPTIONS.find((item) => item.value === role), [role]);

  const passwordScore = useMemo(() => {
    const value = mode === "login" ? password : registerForm.password;
    let score = 0;
    if (value.length >= 6) score += 1;
    if (/[A-Z]/.test(value) || /[a-z]/.test(value)) score += 1;
    if (/\d/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value)) score += 1;
    return score;
  }, [mode, password, registerForm.password]);

  const applySeededAccount = (account: (typeof SEEDED_ACCOUNTS)[number]) => {
    setMode("login");
    setRole(account.role);
    setUsername(account.username);
    setPassword(account.password);
    setMessage(`Filled ${account.label}. Submit the form to authenticate against the backend service.`);
  };

  const updateRegisterField = <K extends keyof RegisterForm>(key: K, value: RegisterForm[K]) => {
    setRegisterForm((current) => ({ ...current, [key]: value }));
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!username || !password) {
      setMessage("Enter a username or email address together with the password.");
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
        throw new Error(payload.message || `Login failed with status ${response.status}.`);
      }

      storeAuthSession(payload);
      broadcastAuthChange(payload.role);
      setMessage(`Welcome back, ${payload.displayName}. Redirecting to the workspace...`);
      window.setTimeout(() => {
        navigateWithTransition(
          router,
          payload.role === "admin" ? "/admin" : payload.role === "operator" ? "/visualize" : "/workspace",
          { replace: true },
        );
      }, 220);
    } catch (error) {
      console.error("backend login failed", error);
      clearAuthSession();
      setMessage(error instanceof Error ? error.message : "Unable to sign in. Check whether the backend service is running.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { displayName, username: nextUsername, email, department, password: nextPassword, confirmPassword } = registerForm;
    if (!displayName || !nextUsername || !email || !department || !nextPassword || !confirmPassword) {
      setMessage("Complete every registration field before creating the account.");
      return;
    }
    if (nextPassword.length < 6) {
      setMessage("Password must be at least 6 characters long.");
      return;
    }
    if (nextPassword !== confirmPassword) {
      setMessage("The confirmation password does not match.");
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
        throw new Error(payload.message || `Account creation failed with status ${response.status}.`);
      }

      setMessage(payload.message);
      setUsername(nextUsername);
      setPassword(nextPassword);
      setRegisterForm(EMPTY_REGISTER_FORM);
      setMode("login");
    } catch (error) {
      console.error("backend register failed", error);
      setMessage(error instanceof Error ? error.message : "Unable to create the account. Check whether the backend service is running.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-backdrop" aria-hidden />
      <div className="auth-grid">
        <section className="auth-story">
          <span className="auth-badge">Enterprise Access</span>
          <h1>Operational intelligence platform</h1>
          <p>
            Use this page to authenticate against the real Spring Boot backend. Accounts, sessions, roles, and audit trails are
            persisted on the server. There is no local login fallback anymore, so any failure here points to an actual backend or
            credential issue that needs to be fixed.
          </p>

          <div className="auth-feature-list">
            <div>
              <strong>Four enterprise roles</strong>
              <span>Administrator, engineer, operator, and viewer permissions are enforced by the backend and reflected in the UI.</span>
            </div>
            <div>
              <strong>Real account creation</strong>
              <span>New users are written to backend storage and remain available after restart.</span>
            </div>
            <div>
              <strong>Seeded review accounts</strong>
              <span>Use the seeded credentials below for workshops, demos, and verification runs.</span>
            </div>
          </div>

          <div className="auth-demo-grid">
            {SEEDED_ACCOUNTS.map((account) => (
              <button key={account.username} type="button" className="auth-demo-card" onClick={() => applySeededAccount(account)}>
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
            <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
              Sign in
            </button>
            <button type="button" className={mode === "reg" ? "active" : ""} onClick={() => setMode("reg")}>
              Create account
            </button>
          </div>

          <div className="auth-card-copy">
            <h2>{mode === "login" ? "Enter the enterprise workspace" : "Create a backend account"}</h2>
            <p>{currentRole?.note}</p>
          </div>

          <div className="auth-role-grid">
            {ROLE_OPTIONS.map((item) => (
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
                <span>Username or work email</span>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Enter your username or work email"
                  autoComplete="username"
                />
              </label>
              <label className="auth-password">
                <span>Password</span>
                <input
                  type={showLoginPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowLoginPassword((current) => !current)}>
                  {showLoginPassword ? "Hide" : "Show"}
                </button>
              </label>
              <div className="auth-strength-row">
                <span>Password strength</span>
                <div className="auth-strength-track">
                  <div className={`auth-strength-fill auth-strength-${passwordScore}`} />
                </div>
              </div>
              <button type="submit" className="auth-submit" disabled={submitting}>
                {submitting ? "Signing in..." : `Continue as ${currentRole?.label}`}
              </button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleRegister}>
              <div className="auth-form-grid">
                <label>
                  <span>Display name</span>
                  <input
                    value={registerForm.displayName}
                    onChange={(event) => updateRegisterField("displayName", event.target.value)}
                    placeholder="Example: Alex Chen"
                  />
                </label>
                <label>
                  <span>Username</span>
                  <input
                    value={registerForm.username}
                    onChange={(event) => updateRegisterField("username", event.target.value)}
                    placeholder="Recommended: lowercase username"
                    autoComplete="username"
                  />
                </label>
              </div>
              <div className="auth-form-grid">
                <label>
                  <span>Work email</span>
                  <input
                    value={registerForm.email}
                    onChange={(event) => updateRegisterField("email", event.target.value)}
                    placeholder="name@company.com"
                    autoComplete="email"
                  />
                </label>
                <label>
                  <span>Department</span>
                  <input
                    value={registerForm.department}
                    onChange={(event) => updateRegisterField("department", event.target.value)}
                    placeholder="Quality, Operations, Data Engineering"
                  />
                </label>
              </div>
              <label className="auth-password">
                <span>Password</span>
                <input
                  type={showRegisterPassword ? "text" : "password"}
                  value={registerForm.password}
                  onChange={(event) => updateRegisterField("password", event.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowRegisterPassword((current) => !current)}>
                  {showRegisterPassword ? "Hide" : "Show"}
                </button>
              </label>
              <label className="auth-password">
                <span>Confirm password</span>
                <input
                  type={showRegisterConfirmPassword ? "text" : "password"}
                  value={registerForm.confirmPassword}
                  onChange={(event) => updateRegisterField("confirmPassword", event.target.value)}
                  placeholder="Repeat the password"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowRegisterConfirmPassword((current) => !current)}>
                  {showRegisterConfirmPassword ? "Hide" : "Show"}
                </button>
              </label>
              <div className="auth-strength-row">
                <span>Password strength</span>
                <div className="auth-strength-track">
                  <div className={`auth-strength-fill auth-strength-${passwordScore}`} />
                </div>
              </div>
              <button type="submit" className="auth-submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create account"}
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
      <div className="loading-state">Loading the enterprise sign-in page...</div>
    </div>
  );
}
