"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

/* ------------------------------------------------------------------ */
/*  Page context definitions                                          */
/* ------------------------------------------------------------------ */

type PageContext = {
  route: string;
  label: string;
  description: string;
  quickActions: Array<{
    label: string;
    prompt: string;
    icon: string;
  }>;
  tips: string[];
};

const PAGE_CONTEXTS: PageContext[] = [
  {
    route: "/home",
    label: "总览首页",
    description: "平台核心能力总览，包含模块导航、核心流程和项目路线图。",
    quickActions: [
      { label: "介绍平台功能", prompt: "请用简单的话介绍这个检测平台能做什么，我是一线工人。", icon: "📋" },
      { label: "推荐工作流程", prompt: "我刚开始使用这个系统，请推荐我每天的工作流程。", icon: "🔄" },
      { label: "解释核心流程", prompt: "核心流程的观察、诊断、行动、闭环分别是什么意思？", icon: "💡" },
    ],
    tips: ["按 Alt+1 随时回到首页", "点击模块卡片可快速跳转到对应功能"],
  },
  {
    route: "/visualize",
    label: "指挥中心",
    description: "质量组合、吞吐趋势、队列状态和执行日志的高管概览。",
    quickActions: [
      { label: "分析质量趋势", prompt: "帮我分析当前的质量趋势数据，有没有异常？", icon: "📊" },
      { label: "解读队列状态", prompt: "当前队列状态怎么样？有没有积压？", icon: "📈" },
      { label: "生成报告摘要", prompt: "请根据指挥中心的数据，生成一份简要报告。", icon: "📝" },
    ],
    tips: ["数据每12秒自动刷新", "点击图表区域可查看详情"],
  },
  {
    route: "/operations",
    label: "运行中台",
    description: "监控和数字孪生域的统一交接页面，整合设备运行状态。",
    quickActions: [
      { label: "检查设备状态", prompt: "帮我检查所有设备的运行状态，有没有需要关注的？", icon: "🔧" },
      { label: "查看异常设备", prompt: "当前有哪些设备温度过高或利用率异常？", icon: "⚠️" },
      { label: "操作建议", prompt: "根据当前设备状态，给我操作建议。", icon: "💡" },
    ],
    tips: ["设备温度>68°C为危险状态", "利用率>90%需要关注"],
  },
  {
    route: "/monitor",
    label: "监控中心",
    description: "相机墙、警报分类队列和前线设备检查，用于快速响应。",
    quickActions: [
      { label: "查看警报", prompt: "当前有哪些警报？帮我按严重程度排序。", icon: "🚨" },
      { label: "相机状态", prompt: "所有相机的状态怎么样？有没有离线的？", icon: "📷" },
      { label: "处理警报建议", prompt: "我该按什么顺序处理当前的警报？", icon: "✅" },
    ],
    tips: ["点击相机卡片可开启实时预览", "警报按严重程度自动排序"],
  },
  {
    route: "/workspace",
    label: "智能工作区",
    description: "AI助手、数据中心、报告中心和训练链集成在一个生产力空间。",
    quickActions: [
      { label: "AI分析数据", prompt: "帮我用AI分析最近的检测数据。", icon: "🤖" },
      { label: "生成检测报告", prompt: "请帮我生成一份检测报告。", icon: "📄" },
      { label: "训练模型状态", prompt: "当前模型训练的状态如何？", icon: "🎯" },
    ],
    tips: ["工作区整合了AI、数据和报告功能", "按 Alt+A 随时打开AI助手"],
  },
  {
    route: "/admin",
    label: "管理后台",
    description: "系统治理、导入质量控制和企业管理级运营策略。",
    quickActions: [
      { label: "系统健康检查", prompt: "帮我检查系统整体健康状况。", icon: "🏥" },
      { label: "数据导入状态", prompt: "最近的数据导入任务状态如何？", icon: "📥" },
      { label: "用户权限说明", prompt: "不同角色（操作员、工程师、管理员）分别能做什么？", icon: "👥" },
    ],
    tips: ["管理员可以管理所有系统功能", "数据导入支持批量操作"],
  },
  {
    route: "/digital-twin",
    label: "数字孪生",
    description: "3D场景诊断、传感器映射、流程解释和设备网格上下文。",
    quickActions: [
      { label: "3D模型操作", prompt: "教我怎么操作3D模型，旋转、缩放、查看细节。", icon: "🎮" },
      { label: "传感器解读", prompt: "帮我解读当前传感器数据，有没有异常？", icon: "📡" },
      { label: "设备映射说明", prompt: "数字孪生中的设备映射是什么意思？", icon: "🗺️" },
    ],
    tips: ["鼠标左键拖动旋转3D模型", "滚轮缩放，右键平移"],
  },
  {
    route: "/ai-assistant",
    label: "AI助手",
    description: "独立的AI对话界面，支持多轮问答和深度分析。",
    quickActions: [
      { label: "缺陷检测问答", prompt: "常见的轮毂表面缺陷有哪些类型？如何区分？", icon: "🔍" },
      { label: "操作指导", prompt: "我需要检测一批新轮毂，请给我操作步骤指导。", icon: "📖" },
      { label: "故障排查", prompt: "检测设备出现异常读数，怎么排查？", icon: "🔧" },
    ],
    tips: ["AI助手支持多轮对话", "可以切换操作员/工程师/管理者视角"],
  },
  {
    route: "/data-hub",
    label: "数据中心",
    description: "数据源管理和数据浏览。",
    quickActions: [
      { label: "数据源状态", prompt: "当前有哪些数据源？状态如何？", icon: "💾" },
      { label: "数据质量检查", prompt: "帮我检查数据质量，有没有缺失或异常？", icon: "✓" },
    ],
    tips: ["数据源状态影响AI分析结果"],
  },
  {
    route: "/training",
    label: "训练中心",
    description: "模型训练任务管理和版本控制。",
    quickActions: [
      { label: "训练进度", prompt: "当前训练任务的进度如何？", icon: "📈" },
      { label: "模型选择建议", prompt: "我该选哪个模型版本用于生产？", icon: "🎯" },
    ],
    tips: ["训练任务可能需要较长时间", "可以查看历史版本对比"],
  },
  {
    route: "/annotation",
    label: "标注工作室",
    description: "数据标注和标注项目管理。",
    quickActions: [
      { label: "标注指导", prompt: "教我怎么标注缺陷数据，有什么规范？", icon: "🏷️" },
      { label: "标注进度", prompt: "当前标注项目的进度如何？", icon: "📊" },
    ],
    tips: ["标注质量直接影响模型效果", "支持快捷键加速标注"],
  },
];

/* ------------------------------------------------------------------ */
/*  Hook: usePageContext                                              */
/* ------------------------------------------------------------------ */

export function usePageContext() {
  const pathname = usePathname();

  const context = PAGE_CONTEXTS.find((c) => {
    if (pathname === c.route) return true;
    if (pathname.startsWith(c.route + "/")) return true;
    return false;
  });

  // Fallback for alias routes
  if (!context) {
    if (pathname === "/" || pathname === "/home") {
      return PAGE_CONTEXTS[0];
    }
  }

  return context ?? {
    route: pathname,
    label: "当前页面",
    description: "欢迎使用工业表面缺陷智能检测系统。",
    quickActions: [
      { label: "帮助", prompt: "请告诉我这个页面能做什么。", icon: "❓" },
    ],
    tips: ["按 Alt+/ 查看所有快捷键"],
  };
}

/* ------------------------------------------------------------------ */
/*  Component: PageContextBanner                                      */
/*  Shows contextual AI suggestions at the top of each page           */
/* ------------------------------------------------------------------ */

export default function PageContextBanner() {
  const context = usePageContext();
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissed state when page changes
  useEffect(() => {
    setDismissed(false);
    setExpanded(false);
  }, [context.route]);

  if (dismissed) return null;

  return (
    <div className="page-context-banner">
      <div className="page-context-banner-main">
        <div className="page-context-banner-info">
          <span className="page-context-banner-icon">🤖</span>
          <div>
            <strong>{context.label} - AI 帮助</strong>
            <p>{context.description}</p>
          </div>
        </div>
        <div className="page-context-banner-actions">
          <button
            type="button"
            className="page-context-toggle-btn"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
          >
            {expanded ? "收起" : "AI 快捷操作"}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          <button
            type="button"
            className="page-context-dismiss-btn"
            onClick={() => setDismissed(true)}
            aria-label="关闭"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {expanded && (
        <div className="page-context-banner-expanded">
          <div className="page-context-quick-actions">
            {context.quickActions.map((action) => (
              <button
                key={action.label}
                type="button"
                className="page-context-action-btn"
                onClick={() => {
                  // Send the prompt to the floating AI assistant
                  window.dispatchEvent(
                    new CustomEvent("ai:quick-prompt", {
                      detail: { prompt: action.prompt },
                    })
                  );
                }}
              >
                <span className="page-context-action-icon">{action.icon}</span>
                <span>{action.label}</span>
              </button>
            ))}
          </div>
          {context.tips.length > 0 && (
            <div className="page-context-tips">
              {context.tips.map((tip, i) => (
                <span key={i} className="page-context-tip">
                  💡 {tip}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
