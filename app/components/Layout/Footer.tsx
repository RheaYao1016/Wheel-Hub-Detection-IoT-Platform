"use client";

import { useLocale } from "../Locale/LocaleProvider";

export default function Footer() {
  const { text } = useLocale();

  return (
    <footer className="footer-shell">
      <div>
        <strong>{text("更精巧的工业表面缺陷智能检测系统", "Industrial Surface Defect Detection System")}</strong>
        <span>
          {text(
            "覆盖 AI 诊断、报告生成、训练编排与数字孪生运营。",
            "Covers AI diagnostics, report generation, training orchestration, and digital twin operations.",
          )}
        </span>
      </div>
      <div>
        <span>{text(`© ${new Date().getFullYear()} 更精巧的工业表面缺陷智能检测系统`, `© ${new Date().getFullYear()} Industrial Surface Defect Detection System`)}</span>
        <span>{text("项目协作 / 技术联系：suyiyao@stumail.ysu.edu.cn", "Project collaboration / technical contact: suyiyao@stumail.ysu.edu.cn")}</span>
      </div>
    </footer>
  );
}
