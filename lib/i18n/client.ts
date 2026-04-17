import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import type { AppLocale } from "@/lib/locale";
import { I18N_RESOURCES, type TranslationKey } from "@/lib/i18n/resources";
import {
  AUTO_PAGE_TRANSLATIONS_EN,
  AUTO_PAGE_TRANSLATIONS_ZH,
} from "@/lib/i18n/auto-page-resources";
import {
  MANUAL_PAGE_TRANSLATIONS_EN,
  MANUAL_PAGE_TRANSLATIONS_ZH,
} from "@/lib/i18n/manual-page-resources";

type TranslationValues = Record<string, string | number>;

let initialized = false;
const inlineKeyCache = new Map<string, string>();

function hashInlineText(input: string) {
  let hash = 5381;
  for (let index = 0; index < input.length; index += 1) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
}

function getInlineKey(zh: string, en: string) {
  const signature = `${zh}::${en}`;
  const cached = inlineKeyCache.get(signature);
  if (cached) return cached;
  const key = `inline.${hashInlineText(signature)}`;
  inlineKeyCache.set(signature, key);
  return key;
}

function registerInlinePair(key: string, zh: string, en: string) {
  const i18n = ensureI18n();
  const zhExists = i18n.exists(key, { lng: "zh-CN" });
  const enExists = i18n.exists(key, { lng: "en-US" });
  if (!zhExists) {
    i18n.addResource("zh-CN", "translation", key, zh, { silent: true });
  }
  if (!enExists) {
    i18n.addResource("en-US", "translation", key, en, { silent: true });
  }
}

export function ensureI18n() {
  if (initialized) {
    return i18next;
  }

  i18next.use(initReactI18next).init({
    resources: I18N_RESOURCES as Record<
      string,
      { translation: Record<string, string> }
    >,
    lng: "zh-CN",
    fallbackLng: "en-US",
    interpolation: { escapeValue: false },
    returnNull: false,
  });

  for (const [key, value] of Object.entries(AUTO_PAGE_TRANSLATIONS_ZH)) {
    i18next.addResource("zh-CN", "translation", key, value, { silent: true });
  }
  for (const [key, value] of Object.entries(AUTO_PAGE_TRANSLATIONS_EN)) {
    i18next.addResource("en-US", "translation", key, value, { silent: true });
  }
  for (const [key, value] of Object.entries(MANUAL_PAGE_TRANSLATIONS_ZH)) {
    i18next.addResource("zh-CN", "translation", key, value, { silent: true });
  }
  for (const [key, value] of Object.entries(MANUAL_PAGE_TRANSLATIONS_EN)) {
    i18next.addResource("en-US", "translation", key, value, { silent: true });
  }

  initialized = true;
  return i18next;
}

export function translate(
  locale: AppLocale,
  key: string,
  values?: TranslationValues,
  fallback?: string,
) {
  const i18n = ensureI18n();
  if (i18n.language !== locale) {
    i18n.changeLanguage(locale).catch(() => {
      // Keep current language if runtime switch fails.
    });
  }

  return i18n.t(key as TranslationKey, {
    ...(values ?? {}),
    defaultValue: fallback ?? key,
  });
}

export function translateInline(
  locale: AppLocale,
  zh: string,
  en: string,
  values?: TranslationValues,
) {
  const key = getInlineKey(zh, en);
  registerInlinePair(key, zh, en);
  const fallback = locale === "zh-CN" ? zh : en;
  return translate(locale, key, values, fallback);
}
