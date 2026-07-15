"use client";

import { Languages } from "lucide-react";
import { Button } from "../ui/Button";
import { useLocale } from "./LocaleProvider";

export default function LanguageToggle() {
  const { locale, setLocale, t } = useLocale();

  const nextLocale = locale === "zh-CN" ? "en-US" : "zh-CN";
  const label =
    locale === "zh-CN"
      ? t("common.languageSwitch", undefined, "Switch to English")
      : t("common.languageSwitch", undefined, "切换到中文");

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => setLocale(nextLocale)}
      aria-label={label}
      title={label}
      className="h-9 w-9 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-accent/10 hover:text-foreground"
    >
      <Languages className="h-4 w-4" />
      <span className="sr-only">{label}</span>
    </Button>
  );
}
