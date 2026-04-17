"use client";

import { useLocale } from "../Locale/LocaleProvider";

export default function Footer() {
  const { t } = useLocale();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer-shell">
      <div>
        <strong>
          {t(
            "footer.title",
            undefined,
            "Industrial Surface Defect Detection System",
          )}
        </strong>
        <span>
          {t(
            "footer.description",
            undefined,
            "Covers AI diagnostics, report generation, training orchestration, and digital twin operations.",
          )}
        </span>
      </div>
      <div>
        <span>
          {`© ${currentYear} ${t(
            "footer.title",
            undefined,
            "Industrial Surface Defect Detection System",
          )}`}
        </span>
        <span>
          {t(
            "footer.contact",
            undefined,
            "Project collaboration / technical contact: suyiyao@stumail.ysu.edu.cn",
          )}
        </span>
      </div>
    </footer>
  );
}
