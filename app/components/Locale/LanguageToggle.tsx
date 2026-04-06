"use client";

import { useLocale } from "./LocaleProvider";

export default function LanguageToggle() {
  const { locale, setLocale, locales, text } = useLocale();

  return (
    <div className="theme-toggle-shell" aria-label={text("切换语言", "Switch language")}>
      {locales.map((option) => {
        const active = locale === option.id;
        return (
          <button
            key={option.id}
            type="button"
            className={`theme-chip ${active ? "theme-chip-active" : ""}`}
            onClick={() => setLocale(option.id)}
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
