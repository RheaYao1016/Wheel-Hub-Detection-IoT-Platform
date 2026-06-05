export type AppLocale = "zh-CN" | "en-US";

export const DEFAULT_LOCALE: AppLocale = "zh-CN";

export const LOCALE_OPTIONS = [
  {
    id: "zh-CN" as const,
    shortLabel: "中文",
    label: "简体中文",
    description: "界面与 AI 输出统一使用简体中文。",
  },
  {
    id: "en-US" as const,
    shortLabel: "EN",
    label: "English",
    description: "Interface and AI output in English.",
  },
];

export function isAppLocale(
  value: string | null | undefined,
): value is AppLocale {
  return value === "zh-CN" || value === "en-US";
}
