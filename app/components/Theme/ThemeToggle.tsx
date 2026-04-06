"use client";

import { useLocale } from "../Locale/LocaleProvider";
import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { theme, setTheme, themes } = useTheme();
  const { text } = useLocale();

  return (
    <div className="theme-toggle-shell" aria-label={text("切换主题", "Switch theme")}>
      {themes.map((option) => {
        const active = theme === option.id;
        return (
          <button
            key={option.id}
            type="button"
            className={`theme-chip ${active ? "theme-chip-active" : ""}`}
            onClick={() => setTheme(option.id)}
            title={option.description}
            aria-pressed={active}
          >
            <span className="theme-chip-dot" />
            {option.shortLabel}
          </button>
        );
      })}
    </div>
  );
}
