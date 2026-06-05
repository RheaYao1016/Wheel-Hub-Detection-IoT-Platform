"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

/* ------------------------------------------------------------------ */
/*  Command palette items                                             */
/* ------------------------------------------------------------------ */

type CommandItem = {
  id: string;
  label: string;
  description: string;
  icon: string;
  href?: string;
  action?: string;   // event name to dispatch
  category: "nav" | "action" | "ai";
  shortcut?: string;
};

const COMMANDS: CommandItem[] = [
  // Navigation
  { id: "nav-home", label: "总览首页", description: "查看平台核心能力总览", icon: "🏠", href: "/home", category: "nav", shortcut: "Alt+1" },
  { id: "nav-visualize", label: "指挥中心", description: "质量组合与吞吐趋势概览", icon: "📊", href: "/visualize", category: "nav", shortcut: "Alt+2" },
  { id: "nav-operations", label: "运行中台", description: "监控和数字孪生统一交接", icon: "⚙️", href: "/operations", category: "nav", shortcut: "Alt+3" },
  { id: "nav-workspace", label: "智能工作区", description: "AI、数据、报告和训练集成", icon: "🧠", href: "/workspace", category: "nav", shortcut: "Alt+4" },
  { id: "nav-monitor", label: "监控中心", description: "相机墙和警报分类队列", icon: "📹", href: "/monitor", category: "nav", shortcut: "Alt+5" },
  { id: "nav-admin", label: "管理后台", description: "系统治理和运营策略", icon: "🛡️", href: "/admin", category: "nav", shortcut: "Alt+6" },
  { id: "nav-twin", label: "数字孪生", description: "3D场景诊断和传感器映射", icon: "🔮", href: "/digital-twin", category: "nav" },
  { id: "nav-ai", label: "AI助手", description: "独立AI对话界面", icon: "🤖", href: "/ai-assistant", category: "nav" },
  { id: "nav-data", label: "数据中心", description: "数据源管理和浏览", icon: "💾", href: "/data-hub", category: "nav" },
  { id: "nav-training", label: "训练中心", description: "模型训练任务管理", icon: "🎯", href: "/training", category: "nav" },
  { id: "nav-annotation", label: "标注工作室", description: "数据标注项目管理", icon: "🏷️", href: "/annotation", category: "nav" },
  { id: "nav-reports", label: "报告中心", description: "检测报告生成和管理", icon: "📄", href: "/reports", category: "nav" },
  { id: "nav-config", label: "平台配置", description: "端点配置和服务管理", icon: "🔧", href: "/platform-config", category: "nav" },

  // Actions
  { id: "act-shortcuts", label: "查看快捷键", description: "显示所有键盘快捷键", icon: "⌨️", action: "shortcut:show-help", category: "action", shortcut: "Alt+/" },
  { id: "act-theme", label: "切换深色/浅色主题", description: "切换界面主题", icon: "🌓", action: "shortcut:toggle-theme", category: "action" },
  { id: "act-refresh", label: "刷新当前页面数据", description: "重新加载页面数据", icon: "🔄", action: "shortcut:refresh-page", category: "action" },

  // AI
  { id: "ai-toggle", label: "打开/关闭 AI 助手", description: "切换悬浮AI助手面板", icon: "🤖", action: "shortcut:toggle-ai", category: "ai", shortcut: "Alt+A" },
  { id: "ai-ask", label: "向AI提问", description: "直接向AI助手发送问题", icon: "💬", action: "shortcut:ai-focus", category: "ai" },
  { id: "ai-defect", label: "AI: 缺陷类型说明", description: "了解常见缺陷类型", icon: "🔍", action: "ai:quick-prompt", category: "ai" },
  { id: "ai-guide", label: "AI: 操作指导", description: "获取当前页面操作指导", icon: "📖", action: "ai:quick-prompt", category: "ai" },
  { id: "ai-health", label: "AI: 系统健康检查", description: "检查系统运行状态", icon: "🏥", action: "ai:quick-prompt", category: "ai" },
];

/* ------------------------------------------------------------------ */
/*  Component: CommandPalette                                         */
/* ------------------------------------------------------------------ */

export default function CommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Listen for Alt+K to open
  useEffect(() => {
    function onPalette(e: Event) {
      setOpen((v) => !v);
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    window.addEventListener("shortcut:command-palette", onPalette);
    return () => window.removeEventListener("shortcut:command-palette", onPalette);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    }
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open]);

  // Filter commands
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMANDS;
    return COMMANDS.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.category.includes(q) ||
        (c.shortcut && c.shortcut.toLowerCase().includes(q))
    );
  }, [query]);

  // Reset active index when filter changes
  useEffect(() => {
    setActiveIndex(0);
  }, [filtered.length]);

  const executeCommand = useCallback(
    (cmd: CommandItem) => {
      setOpen(false);
      setQuery("");

      if (cmd.href) {
        router.push(cmd.href);
      } else if (cmd.action) {
        if (cmd.id === "ai-defect") {
          window.dispatchEvent(
            new CustomEvent("ai:quick-prompt", {
              detail: { prompt: "请介绍常见的轮毂表面缺陷类型和区分方法。" },
            })
          );
          window.dispatchEvent(new CustomEvent("shortcut:toggle-ai"));
        } else if (cmd.id === "ai-guide") {
          window.dispatchEvent(
            new CustomEvent("ai:quick-prompt", {
              detail: { prompt: "请指导我如何使用当前页面的功能。" },
            })
          );
          window.dispatchEvent(new CustomEvent("shortcut:toggle-ai"));
        } else if (cmd.id === "ai-health") {
          window.dispatchEvent(
            new CustomEvent("ai:quick-prompt", {
              detail: { prompt: "请帮我检查系统整体健康状况。" },
            })
          );
          window.dispatchEvent(new CustomEvent("shortcut:toggle-ai"));
        } else if (cmd.id === "act-theme") {
          window.dispatchEvent(new CustomEvent("shortcut:toggle-theme"));
        } else if (cmd.id === "act-refresh") {
          window.dispatchEvent(new CustomEvent("shortcut:refresh-page"));
        } else {
          window.dispatchEvent(new CustomEvent(cmd.action));
        }
      }
    },
    [router]
  );

  // Keyboard navigation inside palette
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && filtered[activeIndex]) {
        e.preventDefault();
        executeCommand(filtered[activeIndex]);
      }
    },
    [activeIndex, executeCommand, filtered]
  );

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector(".cmd-item-active");
    activeEl?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!open) return null;

  const categoryLabels: Record<string, string> = {
    nav: "页面导航",
    action: "快捷操作",
    ai: "AI 助手",
  };

  // Group by category
  const grouped = filtered.reduce(
    (acc, cmd) => {
      const cat = cmd.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(cmd);
      return acc;
    },
    {} as Record<string, CommandItem[]>
  );

  let flatIndex = 0;

  return (
    <div
      className="cmd-palette-backdrop"
      onClick={() => {
        setOpen(false);
        setQuery("");
      }}
      role="dialog"
      aria-label="快速搜索"
    >
      <div
        className="cmd-palette-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cmd-palette-input-shell">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索页面、操作或AI功能..."
            className="cmd-palette-input"
            autoComplete="off"
          />
          <kbd className="cmd-palette-esc">Esc</kbd>
        </div>

        <div ref={listRef} className="cmd-palette-list">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <div className="cmd-palette-group-label">
                {categoryLabels[cat] ?? cat}
              </div>
              {items.map((cmd) => {
                const idx = flatIndex++;
                const isActive = idx === activeIndex;
                return (
                  <button
                    key={cmd.id}
                    type="button"
                    className={`cmd-item ${isActive ? "cmd-item-active" : ""}`}
                    onClick={() => executeCommand(cmd)}
                    onMouseEnter={() => setActiveIndex(idx)}
                  >
                    <span className="cmd-item-icon">{cmd.icon}</span>
                    <div className="cmd-item-text">
                      <strong>{cmd.label}</strong>
                      <span>{cmd.description}</span>
                    </div>
                    {cmd.shortcut && (
                      <kbd className="cmd-item-shortcut">{cmd.shortcut}</kbd>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="cmd-palette-empty">
              没有找到匹配的结果
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
