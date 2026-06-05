"use client";

import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { theme, setTheme, themes } = useTheme();

  return (
    <div className="theme-toggle-shell" aria-label="切换主题" role="radiogroup">
      {themes.map((option, index) => {
        const active = theme === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            className={`theme-chip ${active ? "theme-chip-active" : ""}`}
            onClick={() => setTheme(option.id)}
            title={option.description}
            aria-label={option.label}
            style={{
              animationDelay: `${index * 50}ms`,
            }}
          >
            <span className="theme-chip-dot" />
            <span className="theme-chip-label">{option.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
}
