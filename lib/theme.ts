export const THEME_STORAGE_KEY = "wheel-hub-theme";

export type AppTheme = "industrial-night" | "precision-day" | "aurora-grid";

export type ThemeOption = {
  id: AppTheme;
  label: string;
  shortLabel: string;
  description: string;
  colorScheme: "dark" | "light";
};

export type ChartThemeTokens = {
  accent: string;
  accentStrong: string;
  accentDeep: string;
  accentWarm: string;
  danger: string;
  success: string;
  textPrimary: string;
  textSecondary: string;
  panelBg: string;
  panelBgStrong: string;
  ringSoft: string;
  surfaceElevated: string;
  palette: string[];
};

export const DEFAULT_THEME: AppTheme = "industrial-night";

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: "industrial-night",
    label: "工业夜幕",
    shortLabel: "夜幕",
    description: "深色工业驾驶舱，适合大屏、监控和运维看板。",
    colorScheme: "dark",
  },
  {
    id: "precision-day",
    label: "精密日间",
    shortLabel: "日间",
    description: "高亮度高对比方案，适合演示、汇报和白天办公。",
    colorScheme: "light",
  },
  {
    id: "aurora-grid",
    label: "极光蓝图",
    shortLabel: "极光",
    description: "更有科技展示感的蓝绿色蓝图风格。",
    colorScheme: "dark",
  },
];

export const DEFAULT_CHART_THEME_TOKENS: ChartThemeTokens = {
  accent: "#5bbdf7",
  accentStrong: "#51d3c3",
  accentDeep: "#4f82f4",
  accentWarm: "#ffd166",
  danger: "#ff6b81",
  success: "#67e8b5",
  textPrimary: "#e8f3ff",
  textSecondary: "#a6c0dc",
  panelBg: "rgba(8, 22, 40, 0.88)",
  panelBgStrong: "#071a2d",
  ringSoft: "rgba(91, 189, 247, 0.18)",
  surfaceElevated: "rgba(8, 25, 44, 0.9)",
  palette: ["#5bbdf7", "#51d3c3", "#4f82f4", "#ffd166", "#ff6b81", "#9ad0f5"],
};

export function isAppTheme(value: string | null | undefined): value is AppTheme {
  return THEME_OPTIONS.some((theme) => theme.id === value);
}

export function readChartThemeTokens(): ChartThemeTokens {
  if (typeof window === "undefined") {
    return DEFAULT_CHART_THEME_TOKENS;
  }

  const styles = window.getComputedStyle(document.documentElement);
  const read = (variableName: string, fallback: string) => styles.getPropertyValue(variableName).trim() || fallback;

  const accent = read("--accent", DEFAULT_CHART_THEME_TOKENS.accent);
  const accentStrong = read("--accent-strong", DEFAULT_CHART_THEME_TOKENS.accentStrong);
  const accentDeep = read("--accent-deep", DEFAULT_CHART_THEME_TOKENS.accentDeep);
  const accentWarm = read("--accent-warm", DEFAULT_CHART_THEME_TOKENS.accentWarm);
  const danger = read("--danger", DEFAULT_CHART_THEME_TOKENS.danger);
  const textPrimary = read("--text-primary", DEFAULT_CHART_THEME_TOKENS.textPrimary);
  const textSecondary = read("--text-secondary", DEFAULT_CHART_THEME_TOKENS.textSecondary);
  const panelBg = read("--panel-bg", DEFAULT_CHART_THEME_TOKENS.panelBg);
  const panelBgStrong = read("--panel-bg-strong", DEFAULT_CHART_THEME_TOKENS.panelBgStrong);
  const ringSoft = read("--ring-soft", DEFAULT_CHART_THEME_TOKENS.ringSoft);
  const surfaceElevated = read("--surface-elevated", DEFAULT_CHART_THEME_TOKENS.surfaceElevated);

  return {
    accent,
    accentStrong,
    accentDeep,
    accentWarm,
    danger,
    success: DEFAULT_CHART_THEME_TOKENS.success,
    textPrimary,
    textSecondary,
    panelBg,
    panelBgStrong,
    ringSoft,
    surfaceElevated,
    palette: [accent, accentStrong, accentDeep, accentWarm, danger, "#9ad0f5"],
  };
}
