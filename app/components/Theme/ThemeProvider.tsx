"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { AppTheme, DEFAULT_THEME, THEME_OPTIONS, THEME_STORAGE_KEY, isAppTheme } from "@/lib/theme";

type ThemeContextValue = {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  themes: typeof THEME_OPTIONS;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: AppTheme) {
  const root = document.documentElement;
  const nextTheme = THEME_OPTIONS.find((item) => item.id === theme);

  root.dataset.theme = theme;
  root.style.colorScheme = nextTheme?.colorScheme ?? "dark";
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>(DEFAULT_THEME);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    const initialTheme = isAppTheme(storedTheme) ? storedTheme : DEFAULT_THEME;
    setThemeState(initialTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, initialTheme);
    applyTheme(initialTheme);
  }, []);

  const setTheme = (nextTheme: AppTheme) => {
    setThemeState(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
  };

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      themes: THEME_OPTIONS,
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
