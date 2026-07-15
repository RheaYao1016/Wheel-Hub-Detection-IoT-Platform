"use client";

import { useLocale } from "../Locale/LocaleProvider";
import { Separator } from "../ui/Separator";

export default function Footer() {
  const { t } = useLocale();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border bg-card/50 py-6">
      <div className="mx-auto max-w-[1920px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <strong className="text-sm font-semibold text-foreground">
              {t(
                "footer.title",
                undefined,
                "Industrial Surface Defect Detection System",
              )}
            </strong>
            <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">
              {t(
                "footer.description",
                undefined,
                "Covers AI diagnostics, report generation, training orchestration, and digital twin operations.",
              )}
            </p>
          </div>
          <div className="flex flex-col gap-1 text-right md:text-right">
            <span className="text-xs text-muted-foreground">
              {`© ${currentYear} ${t(
                "footer.title",
                undefined,
                "Industrial Surface Defect Detection System",
              )}`}
            </span>
            <span className="text-xs text-muted-foreground">
              {t(
                "footer.contact",
                undefined,
                "Project collaboration / technical contact: suyiyao@stumail.ysu.edu.cn",
              )}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
