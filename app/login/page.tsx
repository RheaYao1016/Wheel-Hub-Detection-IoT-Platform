"use client";

import Link from "next/link";
import axios from "axios";
import {
  Suspense,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import {
  Activity,
  BarChart3,
  Eye,
  EyeOff,
  Factory,
  Gauge,
  Loader2,
  Shield,
  UserRound,
  Wrench,
} from "lucide-react";
import { useLocale } from "../components/Locale/LocaleProvider";
import { Button } from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label";
import { Progress } from "../components/ui/Progress";
import { Badge } from "../components/ui/Badge";
import { cn } from "@/lib/utils";
import {
  broadcastAuthChange,
  clearAuthSession,
  readStoredAuthSession,
  storeAuthSession,
} from "@/lib/auth-session";
import { getBackendApiBase } from "@/lib/dashboard-client";
import {
  listRuntimeApiBaseCandidates,
  rememberWorkingApiBase,
} from "@/lib/runtime-endpoint-config";
import {
  safeLoginRedirect,
  clearPendingNavigation,
  safeRedirect,
} from "@/lib/safe-navigation";
import type { LoginResponse, RegisterResponse, UserRole } from "@/types/auth";

type RegisterForm = {
  displayName: string;
  username: string;
  email: string;
  department: string;
  password: string;
  confirmPassword: string;
};

type AuthReadiness = {
  status: "checking" | "ready" | "error";
  message: string;
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
  const [message, setMessage] = useState<{
    type: "info" | "success" | "error";
    content: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [registerForm, setRegisterForm] =
    useState<RegisterForm>(EMPTY_REGISTER_FORM);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] =
    useState(false);
  const [authReadiness, setAuthReadiness] = useState<AuthReadiness>({
    status: "checking",
    message: t("pages.login.copy001"),
  });
  const redirectTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current !== null) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const roleOptions = useMemo(
    () => [
      {
        value: "admin" as UserRole,
        label: t("pages.login.copy002"),
        note: t("pages.login.copy003"),
        icon: Shield,
      },
      {
        value: "engineer" as UserRole,
        label: t("pages.login.enhancedloginpage.copy013"),
        note: t("pages.login.copy004"),
        icon: Wrench,
      },
      {
        value: "operator" as UserRole,
        label: t("pages.admin.inspections.copy004"),
        note: t("pages.login.copy005"),
        icon: Gauge,
      },
      {
        value: "viewer" as UserRole,
        label: t("pages.login.enhancedloginpage.copy014"),
        note: t("pages.login.copy006"),
        icon: UserRound,
      },
    ],
    [t],
  );

  const seededAccounts = useMemo(
    () => [
      {
        username: "admin-demo",
        password: "admin123",
        role: "admin" as UserRole,
        label: t("pages.login.copy007"),
        note: t("pages.login.copy008"),
        icon: Shield,
      },
      {
        username: "engineer-demo",
        password: "engineer123",
        role: "engineer" as UserRole,
        label: t("pages.login.copy009"),
        note: t("pages.login.copy010"),
        icon: Wrench,
      },
      {
        username: "operator-demo",
        password: "user123",
        role: "operator" as UserRole,
        label: t("pages.login.copy011"),
        note: t("pages.login.copy012"),
        icon: Activity,
      },
      {
        username: "viewer-demo",
        password: "viewer123",
        role: "viewer" as UserRole,
        label: t("pages.login.copy013"),
        note: t("pages.login.copy014"),
        icon: UserRound,
      },
    ],
    [t],
  );

  useEffect(() => {
    setMode(params.get("mode") === "reg" ? "reg" : "login");
  }, [params]);

  useEffect(() => {
    try {
      const session = readStoredAuthSession();
      if (!session || !session.role) return;

      clearPendingNavigation();

      if (session.role === "admin") {
        safeLoginRedirect(router, "admin");
      } else if (session.role === "operator") {
        safeRedirect(router, "/visualize");
      } else {
        safeLoginRedirect(router, session.role);
      }
    } catch (error) {
      console.warn("[LoginPage] Session redirect error:", error);
    }
  }, [router]);

  useEffect(() => {
    setMessage({ type: "info", content: t("pages.login.copy001") });
  }, [t]);

  const primaryApiBase = getBackendApiBase();

  const describeAuthError = useCallback(
    (error: unknown, fallback: string) => {
      if (axios.isAxiosError(error)) {
        const backendMessage =
          typeof error.response?.data === "object" &&
          error.response?.data &&
          "message" in error.response.data &&
          typeof error.response.data.message === "string"
            ? error.response.data.message
            : null;

        if (backendMessage) {
          return backendMessage;
        }

        if (error.code === "ECONNABORTED") {
          return t(
            "pages.login.copy055",
            undefined,
            "登录服务响应超时，请检查本地代理或后端状态。",
          );
        }

        if (error.response?.status) {
          return `HTTP ${error.response.status}`;
        }

        if (error.message && error.message !== "Network Error") {
          return error.message;
        }

        return t(
          "pages.login.copy056",
          undefined,
          "浏览器未能完成认证请求，请检查 API 代理与本地服务。",
        );
      }

      if (error instanceof Error && error.message) {
        return error.message;
      }

      return fallback;
    },
    [t],
  );

  const resolveAuthRequest = useCallback(
    async <T,>(
      path: string,
      init?: RequestInit,
    ): Promise<{ status: number; payload: T }> => {
      let lastError: Error | null = null;

      for (const base of listRuntimeApiBaseCandidates()) {
        try {
          const response = await axios.request<T>({
            url: `${base}${path}`,
            method: init?.method ?? "GET",
            headers:
              init?.headers && typeof init.headers === "object"
                ? Object.fromEntries(new Headers(init.headers).entries())
                : undefined,
            data: typeof init?.body === "string" ? init.body : init?.body,
            withCredentials: false,
            validateStatus: () => true,
          });
          const payload = response.data;

          if (response.status < 200 || response.status >= 300) {
            const message =
              payload &&
              typeof payload === "object" &&
              "message" in payload &&
              typeof payload.message === "string"
                ? payload.message
                : `Request failed with status ${response.status}.`;
            throw new Error(message);
          }

          if (base !== primaryApiBase) {
            rememberWorkingApiBase(base);
          }

          return { status: response.status, payload };
        } catch (error) {
          lastError = new Error(
            describeAuthError(
              error,
              t("pages.login.copy057", undefined, "认证请求失败。"),
            ),
          );
        }
      }

      throw lastError ?? new Error("Request failed.");
    },
    [describeAuthError, primaryApiBase, t],
  );

  const checkAuthReadiness = useCallback(async () => {
    setAuthReadiness({
      status: "checking",
      message: t("pages.login.copy001"),
    });

    try {
      let lastError: Error | null = null;

      for (const base of listRuntimeApiBaseCandidates()) {
        try {
          const response = await axios.get(`${base}/health`, {
            timeout: 8000,
            withCredentials: false,
            validateStatus: () => true,
          });

          if (response.status < 200 || response.status >= 300) {
            throw new Error(`HTTP ${response.status}`);
          }

          if (base !== primaryApiBase) {
            rememberWorkingApiBase(base);
          }

          lastError = null;
          break;
        } catch (error) {
          lastError = new Error(
            describeAuthError(
              error,
              t("pages.login.copy058", undefined, "登录服务探测失败。"),
            ),
          );
        }
      }

      if (lastError) {
        throw lastError;
      }

      setAuthReadiness({
        status: "ready",
        message: t(
          "pages.login.copy053",
          undefined,
          "后端登录服务已就绪，可以直接进入企业工作区。",
        ),
      });
    } catch (error) {
      setAuthReadiness({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : t(
                "pages.login.copy054",
                undefined,
                "暂时无法连接后端登录服务。",
              ),
      });
    }
  }, [describeAuthError, primaryApiBase, t]);

  useEffect(() => {
    checkAuthReadiness().catch(console.error);
  }, [checkAuthReadiness]);

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

  const isAuthAvailable = authReadiness.status === "ready";

  const finishLoginRedirect = useCallback(
    (nextRole: UserRole) => {
      clearPendingNavigation();

      if (nextRole === "admin") {
        safeLoginRedirect(router, "admin");
      } else if (nextRole === "operator") {
        safeRedirect(router, "/visualize");
      } else {
        safeLoginRedirect(router, nextRole);
      }
    },
    [router],
  );

  const submitLoginRequest = useCallback(
    async (credentials: {
      username: string;
      password: string;
      role: UserRole;
      successLabel?: string;
    }) => {
      const { payload } = await resolveAuthRequest<LoginResponse>(
        "/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: credentials.username,
            password: credentials.password,
            role: credentials.role,
          }),
        },
      );

      if (!payload.success) {
        throw new Error(payload.message || "Login failed.");
      }

      storeAuthSession(payload);
      broadcastAuthChange(payload.role);
      setMessage({
        type: "success",
        content:
          credentials.successLabel ??
          t("pages.login.copy017", { p1: payload.displayName }),
      });

      redirectTimeoutRef.current = window.setTimeout(() => {
        try {
          finishLoginRedirect(payload.role);
        } catch (navError) {
          console.error("[LoginPage] Navigation error:", navError);
        }
      }, 420);

      return payload;
    },
    [finishLoginRedirect, resolveAuthRequest, t],
  );

  const applySeededAccount = useCallback((account: (typeof seededAccounts)[number]) => {
    setMode("login");
    setRole(account.role);
    setUsername(account.username);
    setPassword(account.password);
    setMessage({
      type: "info",
      content: t("pages.login.copy015", { p1: account.label }),
    });
  }, [t]);

  const handleSeededQuickLogin = useCallback(
    async (account: (typeof seededAccounts)[number]) => {
      applySeededAccount(account);
      setSubmitting(true);

      try {
        await submitLoginRequest({
          username: account.username,
          password: account.password,
          role: account.role,
          successLabel: t("pages.login.copy015", { p1: account.label }),
        });
      } catch (error) {
        console.error("seeded login failed", error);
        clearAuthSession();
        setMessage({
          type: "error",
          content:
            error instanceof Error ? error.message : t("pages.login.copy018"),
        });
      } finally {
        setSubmitting(false);
      }
    },
    [applySeededAccount, submitLoginRequest, t],
  );

  const updateRegisterField = <K extends keyof RegisterForm>(
    key: K,
    value: RegisterForm[K],
  ) => {
    setRegisterForm((current) => ({ ...current, [key]: value }));
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!username || !password) {
      setMessage({ type: "error", content: t("pages.login.copy016") });
      return;
    }

    setSubmitting(true);
    try {
      await submitLoginRequest({ username, password, role });
    } catch (error) {
      console.error("backend login failed", error);
      clearAuthSession();
      setMessage({
        type: "error",
        content:
          error instanceof Error ? error.message : t("pages.login.copy018"),
      });
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
      setMessage({ type: "error", content: t("pages.login.copy019") });
      return;
    }
    if (nextPassword.length < 6) {
      setMessage({ type: "error", content: t("pages.login.copy020") });
      return;
    }
    if (nextPassword !== confirmPassword) {
      setMessage({ type: "error", content: t("pages.login.copy021") });
      return;
    }

    setSubmitting(true);
    try {
      const { payload } = await resolveAuthRequest<RegisterResponse>(
        "/auth/register",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...registerForm, role }),
        },
      );

      if (!payload.success) {
        throw new Error(payload.message || "Account creation failed.");
      }

      setMessage({ type: "success", content: payload.message });
      setUsername(nextUsername);
      setPassword(nextPassword);
      setRegisterForm(EMPTY_REGISTER_FORM);
      setMode("login");
    } catch (error) {
      console.error("backend register failed", error);
      setMessage({
        type: "error",
        content:
          error instanceof Error ? error.message : t("pages.login.copy022"),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-[calc(100vh-72px-1rem)] items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-primary/10 blur-[100px]" />
        <div className="absolute -bottom-32 -left-32 h-[24rem] w-[24rem] rounded-full bg-accent/10 blur-[100px]" />
        <div className="absolute left-1/2 top-1/2 h-[20rem] w-[20rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ring/5 blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="grid w-full max-w-6xl gap-8 lg:grid-cols-2"
      >
        <section className="flex flex-col justify-center space-y-8">
          <div className="space-y-4">
            <Badge variant="outline" className="h-8 px-3 text-xs">
              <Factory className="mr-2 h-3.5 w-3.5" />
              {t("pages.login.copy023")}
            </Badge>
            <h1 className="text-4xl font-black leading-tight tracking-tight md:text-5xl">
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                {t("pages.login.copy024")}
              </span>
            </h1>
            <p className="max-w-md text-base leading-relaxed text-muted-foreground">
              {t("pages.login.copy025")}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { title: t("pages.login.copy026"), desc: t("pages.login.copy027"), icon: BarChart3 },
              { title: t("pages.login.copy028"), desc: t("pages.login.copy029"), icon: Activity },
              { title: t("pages.login.copy030"), desc: t("pages.login.copy031"), icon: Shield },
            ].map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * (index + 1), duration: 0.5 }}
                className="rounded-xl border border-border bg-card/50 p-4 backdrop-blur-sm"
              >
                <item.icon className="mb-3 h-6 w-6 text-primary" />
                <strong className="block text-sm font-semibold">{item.title}</strong>
                <span className="text-xs text-muted-foreground">{item.desc}</span>
              </motion.div>
            ))}
          </div>

          <Link
            href="/platform-config"
            className="inline-flex w-fit items-center justify-center rounded-md border border-primary/50 bg-primary/10 px-5 py-2.5 text-sm font-medium text-primary transition hover:bg-primary/20"
          >
            {t("pages.login.copy032")}
          </Link>

          <div className="grid gap-3 sm:grid-cols-2">
            {seededAccounts.map((account, index) => (
              <motion.button
                key={account.username}
                type="button"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.08, duration: 0.5 }}
                onClick={() => handleSeededQuickLogin(account)}
                disabled={!isHydrated || submitting || !isAuthAvailable}
                className="group flex flex-col rounded-xl border border-border bg-card/60 p-4 text-left transition hover:-translate-y-1 hover:border-primary/40 hover:bg-card hover:shadow-card disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-lg bg-primary/10 p-1.5 text-primary">
                    <account.icon className="h-4 w-4" />
                  </span>
                  <strong className="text-sm font-semibold">{account.label}</strong>
                </div>
                <span className="text-xs text-muted-foreground">{account.note}</span>
                <em className="mt-2 text-xs not-italic text-primary/80">
                  {account.username} / {account.password}
                </em>
                <span className="mt-3 text-xs font-medium text-primary">
                  {t(
                    "pages.login.copy055",
                    undefined,
                    "点击后直接进入对应工作区",
                  )}
                </span>
              </motion.button>
            ))}
          </div>
        </section>

        <Card className="glass h-fit border border-border/60">
          <CardContent className="p-6 sm:p-8">
            <div className="mb-6 flex gap-2 rounded-xl bg-muted p-1">
              <button
                type="button"
                onClick={() => setMode("login")}
                disabled={!isHydrated || submitting}
                className={cn(
                  "flex-1 rounded-lg py-2 text-sm font-semibold transition",
                  mode === "login"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                  (!isHydrated || submitting) && "cursor-not-allowed opacity-60",
                )}
              >
                {t("pages.login.copy033")}
              </button>
              <button
                type="button"
                onClick={() => setMode("reg")}
                disabled={!isHydrated || submitting}
                className={cn(
                  "flex-1 rounded-lg py-2 text-sm font-semibold transition",
                  mode === "reg"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                  (!isHydrated || submitting) && "cursor-not-allowed opacity-60",
                )}
              >
                {t("pages.login.copy034")}
              </button>
            </div>

            <div className="mb-6 space-y-1">
              <h2 className="text-xl font-bold">
                {mode === "login"
                  ? t("pages.login.copy035")
                  : t("pages.login.copy036")}
              </h2>
              <p className="text-sm text-muted-foreground">{currentRole?.note}</p>
            </div>

            <div
              className={cn(
                "mb-5 rounded-xl border px-4 py-3 text-sm",
                authReadiness.status === "ready" &&
                  "border-success/30 bg-success/10 text-success",
                authReadiness.status === "checking" &&
                  "border-primary/30 bg-primary/10 text-primary",
                authReadiness.status === "error" &&
                  "border-destructive/30 bg-destructive/10 text-destructive",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <strong className="block text-sm">
                    {t("pages.login.copy056", undefined, "登录服务状态")}
                  </strong>
                  <p className="mt-1 text-xs opacity-90">{authReadiness.message}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      authReadiness.status === "ready"
                        ? "success"
                        : authReadiness.status === "error"
                          ? "destructive"
                          : "info"
                    }
                  >
                    {authReadiness.status === "ready"
                      ? t("common.ready", undefined, "Ready")
                      : authReadiness.status === "error"
                        ? t("common.error", undefined, "Error")
                        : t("common.loading", undefined, "Checking")}
                  </Badge>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => checkAuthReadiness().catch(console.error)}
                    disabled={authReadiness.status === "checking"}
                  >
                    {t("common.retry", undefined, "Retry")}
                  </Button>
                </div>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-2">
              {roleOptions.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setRole(item.value)}
                    disabled={!isHydrated || submitting}
                    className={cn(
                      "auth-role-card flex flex-col rounded-xl border p-3 text-left transition",
                      role === item.value
                        ? "border-primary/50 bg-primary/10 text-primary shadow-glow-sm"
                        : "border-border bg-card/40 text-foreground hover:border-primary/30 hover:bg-card",
                      (!isHydrated || submitting) && "cursor-not-allowed opacity-60",
                    )}
                  >
                    <span className="mb-1 flex items-center gap-2 text-sm font-semibold">
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{item.note}</span>
                  </button>
                );
              })}
            </div>

            {message ? (
              <div
                className={cn(
                  "mb-5 rounded-xl border px-4 py-3 text-sm font-medium",
                  message.type === "success" &&
                    "border-success/30 bg-success/10 text-success",
                  message.type === "error" &&
                    "border-destructive/30 bg-destructive/10 text-destructive",
                  message.type === "info" &&
                    "border-primary/30 bg-primary/10 text-primary",
                )}
              >
                {message.content}
              </div>
            ) : null}

            {!isHydrated ? (
              <div className="mb-5 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-xs text-primary">
                {t(
                  "pages.login.copy057",
                  undefined,
                  "正在初始化登录表单，请稍候后再操作。",
                )}
              </div>
            ) : null}

            {mode === "login" ? (
              <form
                className="auth-form space-y-4"
                onSubmit={handleLogin}
                action="javascript:void(0)"
              >
                <div className="space-y-2">
                  <Label htmlFor="username">{t("pages.login.copy037")}</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder={t("pages.login.copy038")}
                    autoComplete="username"
                    disabled={!isHydrated || submitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">
                    {t("pages.login.enhancedloginpage.copy009")}
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showLoginPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder={t("pages.login.copy039")}
                      autoComplete="current-password"
                      className="pr-10"
                      disabled={!isHydrated || submitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword((current) => !current)}
                      disabled={!isHydrated || submitting}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showLoginPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">
                    {t("pages.login.copy041")}
                  </span>
                  <Progress value={passwordScore * 25} className="h-1.5" />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={!isHydrated || submitting || !isAuthAvailable}
                >
                  {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {submitting
                    ? t("pages.login.enhancedloginpage.copy015")
                    : t("pages.login.copy042", {
                        p1: currentRole?.label ?? "",
                      })}
                </Button>
              </form>
            ) : (
              <form
                className="space-y-4"
                onSubmit={handleRegister}
                action="javascript:void(0)"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="displayName">{t("pages.login.copy043")}</Label>
                    <Input
                      id="displayName"
                      value={registerForm.displayName}
                      onChange={(event) =>
                        updateRegisterField("displayName", event.target.value)
                      }
                      placeholder={t("pages.login.copy044")}
                      disabled={!isHydrated || submitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="regUsername">
                      {t("pages.login.enhancedloginpage.copy007")}
                    </Label>
                    <Input
                      id="regUsername"
                      value={registerForm.username}
                      onChange={(event) =>
                        updateRegisterField("username", event.target.value)
                      }
                      placeholder={t("pages.login.copy045")}
                      autoComplete="username"
                      disabled={!isHydrated || submitting}
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">{t("pages.login.copy046")}</Label>
                    <Input
                      id="email"
                      value={registerForm.email}
                      onChange={(event) =>
                        updateRegisterField("email", event.target.value)
                      }
                      placeholder="name@company.com"
                      autoComplete="email"
                      disabled={!isHydrated || submitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">{t("pages.login.copy047")}</Label>
                    <Input
                      id="department"
                      value={registerForm.department}
                      onChange={(event) =>
                        updateRegisterField("department", event.target.value)
                      }
                      placeholder={t("pages.login.copy048")}
                      disabled={!isHydrated || submitting}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="regPassword">
                    {t("pages.login.enhancedloginpage.copy009")}
                  </Label>
                  <div className="relative">
                    <Input
                      id="regPassword"
                      type={showRegisterPassword ? "text" : "password"}
                      value={registerForm.password}
                      onChange={(event) =>
                        updateRegisterField("password", event.target.value)
                      }
                      placeholder={t("pages.login.copy049")}
                      autoComplete="new-password"
                      className="pr-10"
                      disabled={!isHydrated || submitting}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowRegisterPassword((current) => !current)
                      }
                      disabled={!isHydrated || submitting}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showRegisterPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t("pages.login.copy050")}</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showRegisterConfirmPassword ? "text" : "password"}
                      value={registerForm.confirmPassword}
                      onChange={(event) =>
                        updateRegisterField("confirmPassword", event.target.value)
                      }
                      placeholder={t("pages.login.copy051")}
                      autoComplete="new-password"
                      className="pr-10"
                      disabled={!isHydrated || submitting}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowRegisterConfirmPassword((current) => !current)
                      }
                      disabled={!isHydrated || submitting}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showRegisterConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">
                    {t("pages.login.copy041")}
                  </span>
                  <Progress value={passwordScore * 25} className="h-1.5" />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={!isHydrated || submitting || !isAuthAvailable}
                >
                  {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {submitting
                    ? t("pages.login.copy052")
                    : t("pages.login.copy034")}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="flex min-h-[calc(100vh-72px-1rem)] items-center justify-center">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading the enterprise sign-in page...</span>
      </div>
    </div>
  );
}
