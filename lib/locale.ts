export type AppLocale = "zh-CN" | "en-US";

export const DEFAULT_LOCALE: AppLocale = "zh-CN";
export const LOCALE_STORAGE_KEY = "wheel-hub-app-locale";

export const LOCALE_OPTIONS = [
  {
    id: "zh-CN" as const,
    shortLabel: "中文",
    label: "简体中文",
    description: "界面和 AI 输出统一使用简体中文。",
  },
  {
    id: "en-US" as const,
    shortLabel: "EN",
    label: "English",
    description: "Use full English across the UI and AI outputs.",
  },
];

export function isAppLocale(
  value: string | null | undefined,
): value is AppLocale {
  return value === "zh-CN" || value === "en-US";
}
