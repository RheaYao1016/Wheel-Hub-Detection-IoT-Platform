"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { clearAuthSession } from "@/lib/auth-session";
import { AppLocale, DEFAULT_LOCALE, isAppLocale, LOCALE_OPTIONS, LOCALE_STORAGE_KEY, pickLocaleText } from "@/lib/locale";
import { clearRuntimeCaches } from "@/lib/runtime-cache";

type LocaleContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  locales: typeof LOCALE_OPTIONS;
  text: (zh: string, en: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function applyLocale(locale: AppLocale) {
  document.documentElement.lang = locale;
  document.documentElement.dataset.locale = locale;
}

export default function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(DEFAULT_LOCALE);

  useEffect(() => {
    const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    const initialLocale = isAppLocale(storedLocale) ? storedLocale : DEFAULT_LOCALE;
    setLocaleState(initialLocale);
    window.localStorage.setItem(LOCALE_STORAGE_KEY, initialLocale);
    applyLocale(initialLocale);
  }, []);

  const setLocale = (nextLocale: AppLocale) => {
    if (nextLocale === locale) {
      return;
    }

    setLocaleState(nextLocale);
    window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
    applyLocale(nextLocale);
    clearRuntimeCaches();
    clearAuthSession();
    window.location.assign(`/login?locale=${encodeURIComponent(nextLocale)}&reload=1`);
  };

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      locales: LOCALE_OPTIONS,
      text: (zh: string, en: string) => pickLocaleText(locale, zh, en),
    }),
    [locale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider");
  }

  return context;
}
