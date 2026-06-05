"use client";

import { useLocale } from "../Locale/LocaleProvider";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const { t } = useLocale();

  return (
    <footer className="footer-shell">
      <div>
        <strong>{t("pages.home.copy024")}</strong>
        <span>{t("pages.home.copy025")}</span>
      </div>
      <div>
        <span>{t("pages.login.copy053", { p1: currentYear })}</span>
        <span>{t("common.contactEmail", { p1: "suyiyao@stumail.ysu.edu.cn" })}</span>
      </div>
    </footer>
  );
}
