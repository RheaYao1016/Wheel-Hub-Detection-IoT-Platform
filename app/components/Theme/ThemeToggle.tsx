"use client";

import { Moon, Sun, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "../Locale/LocaleProvider";
import { useTheme } from "./ThemeProvider";
import { THEME_OPTIONS, type AppTheme } from "@/lib/theme";

const themeIcons: Record<AppTheme, React.ReactNode> = {
  "industrial-night": <Moon className="h-4 w-4" />,
  "precision-day": <Sun className="h-4 w-4" />,
  "aurora-grid": <Sparkles className="h-4 w-4" />,
};

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { text } = useLocale();

  return (
    <div
      className="inline-flex items-center gap-1 rounded-xl border border-border bg-muted/50 p-1 backdrop-blur-md"
      aria-label={text("切换主题", "Switch theme")}
      role="group"
    >
      {THEME_OPTIONS.map((option) => {
        const active = theme === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => setTheme(option.id)}
            title={option.description}
            aria-pressed={active}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              active
                ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {themeIcons[option.id]}
            <span className="hidden sm:inline">{option.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
}
