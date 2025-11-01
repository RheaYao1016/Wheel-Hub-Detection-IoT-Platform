"use client";

import Card from "../components/Layout/Card";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

type RoleType = "admin" | "user";

const broadcastRole = (role: RoleType | null) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("app:role-change", { detail: role }));
  }
};

export default function Login() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState(params.get("mode") === "reg" ? "reg" : "login");
  const [role, setRole] = useState<RoleType>("admin");
  const [showPwd, setShowPwd] = useState(false);
  const [showRegPwd, setShowRegPwd] = useState(false);
  const [message, setMessage] = useState(" ");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [regUser, setRegUser] = useState("");
  const [regPwd, setRegPwd] = useState("");
  const [regPwdConfirm, setRegPwdConfirm] = useState("");

  const isAdmin = useMemo(() => role === "admin", [role]);

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!username || !password) {
      setMessage("请输入账号和密码");
      return;
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("role", role);
      if (isAdmin) {
        localStorage.setItem("admin_user", username);
      } else {
        localStorage.setItem("user_name", username);
      }
      broadcastRole(role);
    }
    setMessage("登录成功，正在跳转...");
    setTimeout(() => {
      router.push(isAdmin ? "/admin" : "/visualize");
    }, 300);
  };

  const handleRegister = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!regUser || !regPwd || !regPwdConfirm) {
      setMessage("请完整填写注册信息");
      return;
    }
    if (regPwd.length < 6) {
      setMessage("密码至少 6 位");
      return;
    }
    if (regPwd !== regPwdConfirm) {
      setMessage("两次密码不一致");
      return;
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("admin_user", regUser);
    }
    setMessage("注册成功，请登录");
    setTimeout(() => {
      setMode("login");
      setMessage(" ");
    }, 1000);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#142439] via-[#243859] to-[#2a7ad7]">
      <img
        src="/images/wheel-bg.svg"
        alt="背景轮毂"
        className="pointer-events-none absolute left-1/2 top-[24%] w-[80vw] max-w-[520px] -translate-x-1/2 select-none opacity-35 blur-sm"
      />
      <Card className="relative z-10 w-full max-w-md px-8 pb-10 pt-12">
        <div className="mb-8 flex justify-center gap-6">
          <button
            className={`text-xl font-bold pb-1 ${mode === "login" ? "border-b-2 border-[var(--accent)] text-white" : "border-b-2 border-transparent text-white/60"}`}
            onClick={() => {
              setMode("login");
              setMessage(" ");
            }}
          >
            登录
          </button>
          <button
            className={`text-xl font-bold pb-1 ${mode === "reg" ? "border-b-2 border-[var(--accent)] text-white" : "border-b-2 border-transparent text-white/60"}`}
            onClick={() => {
              setMode("reg");
              setMessage(" ");
            }}
          >
            注册
          </button>
        </div>

        {mode === "login" ? (
          <form className="flex flex-col gap-5" onSubmit={handleLogin}>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="rounded-xl bg-[rgba(10,27,49,0.7)] px-4 py-3 text-white placeholder:text-[rgba(200,224,255,0.6)] focus:outline-none focus:ring-2 focus:ring-[#5bbdf7]"
              placeholder="请输入账号"
              autoComplete="username"
            />
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl bg-[rgba(10,27,49,0.7)] px-4 py-3 pr-10 text-white placeholder:text-[rgba(200,224,255,0.6)] focus:outline-none focus:ring-2 focus:ring-[#5bbdf7]"
                placeholder="请输入密码"
                autoComplete="current-password"
              />
              <span className="absolute right-3 top-3 cursor-pointer text-sm text-cyan-200" onClick={() => setShowPwd((prev) => !prev)}>
                {showPwd ? "隐藏" : "显示"}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-cyan-100">
              <label className="flex cursor-pointer items-center gap-2">
                <input type="radio" checked={role === "admin"} onChange={() => setRole("admin")} /> 管理员
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="radio" checked={role === "user"} onChange={() => setRole("user")} /> 普通用户
              </label>
            </div>
            <button
              type="submit"
              className="mt-2 w-full rounded-full bg-gradient-to-r from-[#5bbdf7] to-[#4f82f4] py-3 text-lg font-semibold text-[#041629] shadow-[0_12px_28px_rgba(91,189,247,0.32)] transition-transform hover:scale-[1.02]"
            >
              登录
            </button>
            <div className="min-h-[20px] text-center text-sm text-[#ffd166]">{message}</div>
          </form>
        ) : (
          <form className="flex flex-col gap-5" onSubmit={handleRegister}>
            <input
              value={regUser}
              onChange={(event) => setRegUser(event.target.value)}
              className="rounded-xl bg-[rgba(10,27,49,0.7)] px-4 py-3 text-white placeholder:text-[rgba(200,224,255,0.6)] focus:outline-none focus:ring-2 focus:ring-[#5bbdf7]"
              placeholder="请输入账号"
              autoComplete="username"
            />
            <div className="relative">
              <input
                type={showRegPwd ? "text" : "password"}
                value={regPwd}
                onChange={(event) => setRegPwd(event.target.value)}
                className="w-full rounded-xl bg-[rgba(10,27,49,0.7)] px-4 py-3 pr-10 text-white placeholder:text-[rgba(200,224,255,0.6)] focus:outline-none focus:ring-2 focus:ring-[#5bbdf7]"
                placeholder="请输入密码（至少 6 位）"
                autoComplete="new-password"
              />
              <span className="absolute right-3 top-3 cursor-pointer text-sm text-cyan-200" onClick={() => setShowRegPwd((prev) => !prev)}>
                {showRegPwd ? "隐藏" : "显示"}
              </span>
            </div>
            <input
              type={showRegPwd ? "text" : "password"}
              value={regPwdConfirm}
              onChange={(event) => setRegPwdConfirm(event.target.value)}
              className="rounded-xl bg-[rgba(10,27,49,0.7)] px-4 py-3 text-white placeholder:text-[rgba(200,224,255,0.6)] focus:outline-none focus:ring-2 focus:ring-[#5bbdf7]"
              placeholder="请再次输入密码"
              autoComplete="new-password"
            />
            <button
              type="submit"
              className="mt-2 w-full rounded-full bg-gradient-to-r from-[#5bbdf7] to-[#4f82f4] py-3 text-lg font-semibold text-[#041629] shadow-[0_12px_28px_rgba(91,189,247,0.32)] transition-transform hover:scale-[1.02]"
            >
              注册
            </button>
            <div className="min-h-[20px] text-center text-sm text-[#ffd166]">{message}</div>
          </form>
        )}
      </Card>
    </div>
  );
}
