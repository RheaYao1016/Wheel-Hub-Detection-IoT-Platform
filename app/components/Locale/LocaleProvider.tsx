"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  AppLocale,
  DEFAULT_LOCALE,
  LOCALE_OPTIONS,
} from "@/lib/locale";
import { ensureI18n, translate, translateInline } from "@/lib/i18n/client";

type LocaleContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  locales: typeof LOCALE_OPTIONS;
  text: (zh: string, en: string) => string;
  t: (
    key: string,
    values?: Record<string, string | number>,
    fallback?: string,
  ) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function applyLocale(locale: AppLocale) {
  if (typeof document === "undefined" || !document.documentElement) return;
  document.documentElement.lang = locale;
  document.documentElement.dataset.locale = locale;
}

const LOCALE_STORAGE_KEY = "preferred-locale";

function getInitialLocale(): AppLocale {
  if (typeof window !== "undefined") {
    const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (saved === "zh-CN" || saved === "en-US") {
      return saved as AppLocale;
    }
  }
  return DEFAULT_LOCALE;
}

export default function LocaleProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<AppLocale>(getInitialLocale);

  useEffect(() => {
    ensureI18n();
    applyLocale(locale);
  }, [locale]);

  const setLocale = (newLocale: AppLocale) => {
    setLocaleState(newLocale);
    applyLocale(newLocale);
    ensureI18n();
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    }
  };

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      locales: LOCALE_OPTIONS,
      text: (zh: string, en: string) => translateInline(locale, zh, en),
      t: (
        key: string,
        values?: Record<string, string | number>,
        fallback?: string,
      ) => translate(locale, key, values, fallback),
    }),
    [locale],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider");
  }

  return context;
}
