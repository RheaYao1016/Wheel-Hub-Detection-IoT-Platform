import type { AppLocale } from "@/lib/locale";
import type { PromptPreset } from "@/types/enterprise";

const PRESET_TRANSLATIONS: Record<
  string,
  { zhName: string; enName: string; zhObjective: string; enObjective: string }
> = {
  "quality-ops-briefing": {
    zhName: "质量运营简报",
    enName: "Quality operations briefing",
    zhObjective: "用一线团队能听懂的语言解释最重要的质量问题，并让协同动作保持一致。",
    enObjective: "Explain the most important quality issue in plain language and keep frontline teams aligned.",
  },
  "report-author": {
    zhName: "正式报告编写",
    enName: "Formal report author",
    zhObjective: "把选中的证据整理成管理层可直接使用的诊断报告，包含动作、影响和导出结构。",
    enObjective: "Turn selected evidence into a board-ready diagnosis report with actions, impact, and export-ready structure.",
  },
  "training-advisor": {
    zhName: "训练顾问",
    enName: "Training run advisor",
    zhObjective: "在启动模型训练前检查标注质量、数据划分和训练准备度。",
    enObjective: "Review annotation quality and training readiness before launching a model run.",
  },
  "dashboard-operator": {
    zhName: "工作台调度助手",
    enName: "Dashboard operator",
    zhObjective: "判断用户请求最适合进入哪个页面或动作流程，让团队更快执行。",
    enObjective: "Decide which enterprise page or action best matches the user's request so teams can move quickly.",
  },
};

export function localizePromptPreset(preset: PromptPreset, locale: AppLocale) {
  const mapping = PRESET_TRANSLATIONS[preset.id];
  if (!mapping) {
    return preset;
  }

  return {
    ...preset,
    name: locale === "zh-CN" ? mapping.zhName : mapping.enName,
    objective: locale === "zh-CN" ? mapping.zhObjective : mapping.enObjective,
  };
}
