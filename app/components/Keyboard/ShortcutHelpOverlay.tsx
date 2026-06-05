"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

/* ------------------------------------------------------------------ */
/*  Shortcut definitions                                              */
/* ------------------------------------------------------------------ */

export type ShortcutDef = {
  id: string;
  keys: string;           // display label, e.g. "Alt + 1"
  label: string;          // Chinese label
  category: "nav" | "action" | "ai";
  handler: () => void;
};

const NAV_SHORTCUTS: Array<{
  keys: string;
  label: string;
  href: string;
  altKey: string;
}> = [
  { keys: "Alt + 1", label: "总览首页", href: "/home", altKey: "1" },
  { keys: "Alt + 2", label: "指挥中心", href: "/visualize", altKey: "2" },
  { keys: "Alt + 3", label: "运行中台", href: "/operations", altKey: "3" },
  { keys: "Alt + 4", label: "智能工作区", href: "/workspace", altKey: "4" },
  { keys: "Alt + 5", label: "监控中心", href: "/monitor", altKey: "5" },
  { keys: "Alt + 6", label: "管理后台", href: "/admin", altKey: "6" },
];

/* ------------------------------------------------------------------ */
/*  Hook: useKeyboardShortcuts                                        */
/* ------------------------------------------------------------------ */

export function useKeyboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname();
  const [helpOpen, setHelpOpen] = useState(false);

  // Expose toggle so FloatingAssistant can call it
  const toggleHelp = useCallback(() => {
    setHelpOpen((v) => !v);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Ignore when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      // Alt + /  or  Ctrl + /  → toggle help overlay
      if (e.key === "/" && (e.altKey || e.ctrlKey)) {
        e.preventDefault();
        setHelpOpen((v) => !v);
        return;
      }

      // Escape → close help
      if (e.key === "Escape" && helpOpen) {
        setHelpOpen(false);
        return;
      }

      // Alt + A → toggle AI assistant
      if (e.key === "a" && e.altKey) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("shortcut:toggle-ai"));
        return;
      }

      // Alt + H → go home
      if (e.key === "h" && e.altKey) {
        e.preventDefault();
        router.push("/home");
        return;
      }

      // Alt + K → command palette (quick search)
      if (e.key === "k" && e.altKey) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("shortcut:command-palette"));
        return;
      }

      // Alt + 1-6 → navigation shortcuts
      if (e.altKey && !e.ctrlKey && !e.shiftKey) {
        const match = NAV_SHORTCUTS.find((s) => s.altKey === e.key);
        if (match) {
          e.preventDefault();
          if (pathname !== match.href) {
            router.push(match.href);
          }
          return;
        }
      }

      // Alt + ? → help (alternative)
      if (e.key === "?" && e.altKey) {
        e.preventDefault();
        setHelpOpen((v) => !v);
        return;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [helpOpen, pathname, router]);

  return { helpOpen, setHelpOpen, toggleHelp, navShortcuts: NAV_SHORTCUTS };
}

/* ------------------------------------------------------------------ */
/*  Component: ShortcutHelpOverlay                                    */
/* ------------------------------------------------------------------ */

export default function ShortcutHelpOverlay() {
  const { helpOpen, setHelpOpen, navShortcuts } = useKeyboardShortcuts();

  if (!helpOpen) return null;

  const actionShortcuts = [
    { keys: "Alt + A", label: "打开/关闭 AI 助手" },
    { keys: "Alt + K", label: "快速搜索" },
    { keys: "Alt + H", label: "返回首页" },
    { keys: "Alt + /", label: "显示/隐藏快捷键帮助" },
    { keys: "Esc", label: "关闭弹窗" },
  ];

  return (
    <div
      className="shortcut-overlay-backdrop"
      onClick={() => setHelpOpen(false)}
      aria-modal="true"
      role="dialog"
      aria-label="快捷键帮助"
    >
      <div
        className="shortcut-overlay-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shortcut-overlay-header">
          <h2>键盘快捷键</h2>
          <p>使用快捷键快速操作，提高工作效率</p>
          <button
            type="button"
            className="shortcut-close-btn"
            onClick={() => setHelpOpen(false)}
            aria-label="关闭"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="shortcut-sections">
          <div className="shortcut-section">
            <h3>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="3 11 22 2 13 21 11 13 3 11" />
              </svg>
              页面导航
            </h3>
            <div className="shortcut-grid">
              {navShortcuts.map((s) => (
                <div key={s.keys} className="shortcut-item">
                  <kbd>{s.keys.replace(" + ", "</kbd> + <kbd>")}</kbd>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="shortcut-section">
            <h3>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              快捷操作
            </h3>
            <div className="shortcut-grid">
              {actionShortcuts.map((s) => (
                <div key={s.keys} className="shortcut-item">
                  <kbd>{s.keys.replace(" + ", "</kbd> + <kbd>")}</kbd>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="shortcut-footer">
          <span>按 <kbd>Alt</kbd> + <kbd>/</kbd> 随时打开此面板</span>
        </div>
      </div>
    </div>
  );
}
