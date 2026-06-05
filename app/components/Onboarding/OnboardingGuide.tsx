"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

/* ------------------------------------------------------------------ */
/*  Onboarding guide for first-time users (workers)                   */
/* ------------------------------------------------------------------ */

type GuideStep = {
  title: string;
  description: string;
  icon: string;
};

const GUIDE_STEPS: GuideStep[] = [
  {
    title: "欢迎使用检测系统",
    description:
      "这是一个帮助您检测轮毂表面缺陷的智能系统。不需要电脑经验，跟着提示操作即可。",
    icon: "👋",
  },
  {
    title: "页面导航",
    description:
      "顶部导航栏可以切换不同功能页面。也可以用键盘 Alt+1~6 快速跳转。点击左上角Logo随时回到首页。",
    icon: "🧭",
  },
  {
    title: "AI 助手随时帮忙",
    description:
      "右下角的AI助手按钮可以随时打开，用中文提问即可获得帮助。按 Alt+A 也能快速打开。",
    icon: "🤖",
  },
  {
    title: "快捷键加速操作",
    description:
      "按 Alt+/ 可以查看所有快捷键。常用快捷键会显示在按钮旁边，记住几个就能大幅提高效率。",
    icon: "⌨️",
  },
  {
    title: "遇到问题？",
    description:
      "每个页面顶部都有AI帮助提示，点击即可获得针对当前页面的操作建议。也可以随时按 Alt+K 搜索功能。",
    icon: "❓",
  },
];

const STORAGE_KEY = "onboarding-completed";

export default function OnboardingGuide() {
  const router = useRouter();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Only show on home page for logged-in users, and only once
    if (pathname !== "/home" && pathname !== "/") return;
    const completed = window.localStorage.getItem(STORAGE_KEY);
    if (completed) return;

    // Small delay so the page loads first
    const timer = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(timer);
  }, [pathname]);

  const handleClose = useCallback(() => {
    setVisible(false);
    window.localStorage.setItem(STORAGE_KEY, "true");
  }, []);

  const handleNext = useCallback(() => {
    if (step < GUIDE_STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      handleClose();
    }
  }, [step, handleClose]);

  const handlePrev = useCallback(() => {
    if (step > 0) setStep((s) => s - 1);
  }, [step]);

  const handleSkip = useCallback(() => {
    handleClose();
  }, []);

  if (!visible) return null;

  const current = GUIDE_STEPS[step];
  const isLast = step === GUIDE_STEPS.length - 1;

  return (
    <div className="onboarding-backdrop" role="dialog" aria-label="新手引导">
      <div className="onboarding-panel">
        <div className="onboarding-icon">{current.icon}</div>
        <h2>{current.title}</h2>
        <p>{current.description}</p>

        <div className="onboarding-dots">
          {GUIDE_STEPS.map((_, i) => (
            <span
              key={i}
              className={`onboarding-dot ${i === step ? "onboarding-dot-active" : ""}`}
            />
          ))}
        </div>

        <div className="onboarding-actions">
          <button
            type="button"
            className="onboarding-skip-btn"
            onClick={handleSkip}
          >
            跳过引导
          </button>
          <div className="onboarding-nav-btns">
            {step > 0 && (
              <button
                type="button"
                className="onboarding-prev-btn"
                onClick={handlePrev}
              >
                上一步
              </button>
            )}
            <button
              type="button"
              className="onboarding-next-btn"
              onClick={handleNext}
            >
              {isLast ? "开始使用" : "下一步"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
