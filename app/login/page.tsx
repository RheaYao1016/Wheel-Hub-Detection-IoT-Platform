"use client";

import { Suspense, type FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Card from "../components/Layout/Card";
import { getBackendApiBase } from "@/lib/dashboard-client";
import type { LoginResponse, RegisterResponse, UserRole } from "@/types/auth";

const broadcastRole = (role: UserRole | null) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("app:role-change", { detail: role }));
  }
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
  const [showPwd, setShowPwd] = useState(false);
  const [showRegPwd, setShowRegPwd] = useState(false);
  const [message, setMessage] = useState("可使用演示账号：admin-demo / admin123，operator-demo / user123");
  const [submitting, setSubmitting] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [regUser, setRegUser] = useState("");
  const [regPwd, setRegPwd] = useState("");
  const [regPwdConfirm, setRegPwdConfirm] = useState("");

  useEffect(() => {
    setMode(params.get("mode") === "reg" ? "reg" : "login");
  }, [params]);

  const isAdmin = useMemo(() => role === "admin", [role]);

  const fallbackLogin = (name: string, selectedRole: UserRole) => {
    localStorage.setItem("role", selectedRole);
    localStorage.setItem(selectedRole === "admin" ? "admin_user" : "user_name", name);
    localStorage.setItem("auth_token", `local-demo-${name}`);
    broadcastRole(selectedRole);
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!username || !password) {
      setMessage("请输入账号和密码");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${getBackendApiBase()}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, role }),
      });
      if (response.ok) {
        const payload = (await response.json()) as LoginResponse;
        if (!payload.success) {
          setMessage(payload.message);
          setSubmitting(false);
          return;
        }
        localStorage.setItem("role", payload.role);
        localStorage.setItem(payload.role === "admin" ? "admin_user" : "user_name", payload.username);
        localStorage.setItem("auth_token", payload.token);
        broadcastRole(payload.role);
        setMessage("登录成功，正在进入控制台...");
        window.setTimeout(() => router.push(payload.role === "admin" ? "/admin" : "/visualize"), 260);
        return;
      }
      throw new Error("backend auth unavailable");
    } catch (error) {
      console.error("backend login failed", error);
      fallbackLogin(username, role);
      setMessage("后端认证暂不可用，已进入本地演示模式。");
      window.setTimeout(() => router.push(isAdmin ? "/admin" : "/visualize"), 260);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!regUser || !regPwd || !regPwdConfirm) {
      setMessage("请完整填写注册信息");
      return;
    }
    if (regPwd.length < 6) {
      setMessage("密码至少需要 6 位");
      return;
    }
    if (regPwd !== regPwdConfirm) {
      setMessage("两次输入的密码不一致");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${getBackendApiBase()}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: regUser, password: regPwd, confirmPassword: regPwdConfirm, role }),
      });
      if (response.ok) {
        const payload = (await response.json()) as RegisterResponse;
        setMessage(payload.message);
        if (payload.success) {
          window.setTimeout(() => setMode("login"), 400);
        }
        return;
      }
      throw new Error("backend register unavailable");
    } catch (error) {
      console.error("backend register failed", error);
      localStorage.setItem("admin_user", regUser);
      setMessage("后端注册服务暂不可用，已记录本地演示账号。");
      window.setTimeout(() => setMode("login"), 400);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-backdrop" aria-hidden />
      <div className="auth-grid">
        <section className="auth-story">
          <span className="auth-badge">Commercial Demo Ready</span>
          <h1>轮毂检测数字孪生平台</h1>
          <p>
            登录页已接入 Spring Boot 演示认证接口，支持注册、登录与角色分流。后端不可用时也会自动回退到本地演示模式，确保项目展示不中断。
          </p>
          <div className="auth-feature-list">
            <div>
              <strong>演示账号</strong>
              <span>`admin-demo / admin123` 管理员，`operator-demo / user123` 普通用户。</span>
            </div>
            <div>
              <strong>双模式认证</strong>
              <span>优先调用 Spring Boot 接口，失败时回退本地演示逻辑。</span>
            </div>
            <div>
              <strong>管理端分流</strong>
              <span>管理员进入运营后台，普通用户进入指挥中心和可视化平台。</span>
            </div>
          </div>
        </section>

        <Card className="auth-card">
          <div className="auth-tabs">
            <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
              登录
            </button>
            <button type="button" className={mode === "reg" ? "active" : ""} onClick={() => setMode("reg")}>
              注册
            </button>
          </div>

          <div className="auth-card-copy">
            <h2>{mode === "login" ? "进入平台" : "创建演示账号"}</h2>
            <p>{mode === "login" ? "登录会优先访问 Spring Boot 后端认证接口。" : "注册的演示账号会保存在本次后端运行实例中。"}</p>
          </div>

          {mode === "login" ? (
            <form className="auth-form" onSubmit={handleLogin}>
              <label>
                <span>账号</span>
                <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="例如：admin-demo" autoComplete="username" />
              </label>
              <label>
                <span>密码</span>
                <div className="auth-password">
                  <input type={showPwd ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="请输入密码" autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPwd((prev) => !prev)}>{showPwd ? "隐藏" : "显示"}</button>
                </div>
              </label>
              <div className="auth-role-switch">
                <button type="button" className={role === "admin" ? "active" : ""} onClick={() => setRole("admin")}>管理员</button>
                <button type="button" className={role === "user" ? "active" : ""} onClick={() => setRole("user")}>普通用户</button>
              </div>
              <button type="submit" className="auth-submit" disabled={submitting}>
                {submitting ? "登录中..." : `登录并进入${isAdmin ? "运营后台" : "可视化平台"}`}
              </button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleRegister}>
              <label>
                <span>账号</span>
                <input value={regUser} onChange={(event) => setRegUser(event.target.value)} placeholder="创建一个演示账号" autoComplete="username" />
              </label>
              <label>
                <span>密码</span>
                <div className="auth-password">
                  <input type={showRegPwd ? "text" : "password"} value={regPwd} onChange={(event) => setRegPwd(event.target.value)} placeholder="至少 6 位" autoComplete="new-password" />
                  <button type="button" onClick={() => setShowRegPwd((prev) => !prev)}>{showRegPwd ? "隐藏" : "显示"}</button>
                </div>
              </label>
              <label>
                <span>确认密码</span>
                <input type={showRegPwd ? "text" : "password"} value={regPwdConfirm} onChange={(event) => setRegPwdConfirm(event.target.value)} placeholder="再次输入密码" autoComplete="new-password" />
              </label>
              <button type="submit" className="auth-submit" disabled={submitting}>
                {submitting ? "提交中..." : "创建演示账号"}
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
      <div className="loading-state">正在加载登录界面...</div>
    </div>
  );
}
