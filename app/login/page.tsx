"use client";

import { Suspense, type FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Card from "../components/Layout/Card";

type RoleType = "admin" | "user";

const broadcastRole = (role: RoleType | null) => {
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
  const [role, setRole] = useState<RoleType>("admin");
  const [showPwd, setShowPwd] = useState(false);
  const [showRegPwd, setShowRegPwd] = useState(false);
  const [message, setMessage] = useState("使用演示账号即可直接进入平台");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [regUser, setRegUser] = useState("");
  const [regPwd, setRegPwd] = useState("");
  const [regPwdConfirm, setRegPwdConfirm] = useState("");

  useEffect(() => {
    setMode(params.get("mode") === "reg" ? "reg" : "login");
  }, [params]);

  const isAdmin = useMemo(() => role === "admin", [role]);

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!username || !password) {
      setMessage("请输入账号和密码");
      return;
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("role", role);
      localStorage.setItem(isAdmin ? "admin_user" : "user_name", username);
      broadcastRole(role);
    }

    setMessage("登录成功，正在进入控制台...");
    window.setTimeout(() => {
      router.push(isAdmin ? "/admin" : "/visualize");
    }, 280);
  };

  const handleRegister = (event: FormEvent<HTMLFormElement>) => {
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

    if (typeof window !== "undefined") {
      localStorage.setItem("admin_user", regUser);
    }

    setMessage("注册成功，请使用新账号登录");
    window.setTimeout(() => {
      setMode("login");
    }, 600);
  };

  return (
    <div className="auth-shell">
      <div className="auth-backdrop" aria-hidden />
      <div className="auth-grid">
        <section className="auth-story">
          <span className="auth-badge">Commercial Demo Ready</span>
          <h1>轮毂检测数字孪生平台</h1>
          <p>
            面向检测产线、设备运维、数字孪生与管理驾驶舱的一体化平台入口。保留现有 Next.js +
            Prisma 技术栈，并为后续接入真实 PLC、MES 与数据库留出标准 API 连接位。
          </p>
          <div className="auth-feature-list">
            <div>
              <strong>检测闭环</strong>
              <span>从视觉判定到仓储联动的统一追踪</span>
            </div>
            <div>
              <strong>运营看板</strong>
              <span>实时指标、告警分级、设备健康总览</span>
            </div>
            <div>
              <strong>数字孪生</strong>
              <span>3D 模型、工艺流程与传感器映射联动</span>
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
            <p>{mode === "login" ? "管理员进入运营后台，普通用户进入可视化中心。" : "注册仅用于本地演示，不会写入远程认证服务。"}</p>
          </div>

          {mode === "login" ? (
            <form className="auth-form" onSubmit={handleLogin}>
              <label>
                <span>账号</span>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="例如：admin-demo"
                  autoComplete="username"
                />
              </label>
              <label>
                <span>密码</span>
                <div className="auth-password">
                  <input
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="输入任意密码即可演示"
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPwd((prev) => !prev)}>
                    {showPwd ? "隐藏" : "显示"}
                  </button>
                </div>
              </label>
              <div className="auth-role-switch">
                <button type="button" className={role === "admin" ? "active" : ""} onClick={() => setRole("admin")}>
                  管理员
                </button>
                <button type="button" className={role === "user" ? "active" : ""} onClick={() => setRole("user")}>
                  普通用户
                </button>
              </div>
              <button type="submit" className="auth-submit">
                登录并进入 {isAdmin ? "运营后台" : "可视化平台"}
              </button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleRegister}>
              <label>
                <span>账号</span>
                <input
                  value={regUser}
                  onChange={(event) => setRegUser(event.target.value)}
                  placeholder="创建一个本地演示账号"
                  autoComplete="username"
                />
              </label>
              <label>
                <span>密码</span>
                <div className="auth-password">
                  <input
                    type={showRegPwd ? "text" : "password"}
                    value={regPwd}
                    onChange={(event) => setRegPwd(event.target.value)}
                    placeholder="至少 6 位"
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowRegPwd((prev) => !prev)}>
                    {showRegPwd ? "隐藏" : "显示"}
                  </button>
                </div>
              </label>
              <label>
                <span>确认密码</span>
                <input
                  type={showRegPwd ? "text" : "password"}
                  value={regPwdConfirm}
                  onChange={(event) => setRegPwdConfirm(event.target.value)}
                  placeholder="再次输入密码"
                  autoComplete="new-password"
                />
              </label>
              <button type="submit" className="auth-submit">
                创建演示账号
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
