"use client";

import Card from "../../components/Layout/Card";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface PreviewRow {
  cells: string[];
}

export default function DataImportPage() {
  const router = useRouter();
  const [filename, setFilename] = useState<string>("");
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("role");
    if (stored !== "admin") {
      router.replace("/login");
    }
  }, [router]);

  const parsed = useMemo(() => ({ headers, rows }), [headers, rows]);

  const handleFile = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      if (!lines.length) {
        setHeaders([]);
        setRows([]);
        return;
      }
      const headerCells = lines[0].split(",").map((cell) => cell.trim());
      const previewRows = lines.slice(1, 6).map((line) => ({ cells: line.split(",").map((cell) => cell.trim()) }));
      setHeaders(headerCells);
      setRows(previewRows);
    };
    reader.readAsText(file, "utf-8");
  };

  return (
    <div className="page-shell pt-0 pb-10">
      <div className="flex flex-col gap-2">
        <span className="text-xs text-[var(--text-secondary)]">管理员后台 / 数据导入</span>
        <h1 className="text-2xl官网群♀♀♀♀♀♀♀♀♀ font-semibold text-white md:text-3xl">数据导入</h1>
      </div>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-white">上传 CSV</h2>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[rgba(91,189,247,0.5)] bg-[rgba(91,189,247,0.08)] px-6 py-10 text-center text-sm text-[rgba(232,243,255,0.86)]">
            <input type="file" accept=".csv" hidden onChange={(e) => handleFile(e.target.files)} />
            <span className="text-base font-semibold text-white">点击或拖拽 CSV 文件到此处</span>
            <span className="text-xs text-[var(--text-secondary)]">UTF-8 编码，建议包含编号、尺寸、中心孔、PCD 等字段</span>
            {filename && <span className="text-xs text-[rgba(91,189,247,0.9)]">已选择：{filename}</span>}
          </label>
          <button
            type="button"
            disabled={!rows.length}
            className={rows.length ? "rounded-full bg-gradient-to-r from-[#5bbdf7] to-[#4f82f4] px-6 py-2 text-sm font-semibold text-[#041629] shadow-[0_10px_24px_rgba(91,189,247,0.3)]" : "cursor-not-allowed rounded-full bg-[rgba(91,189,247,0.1)] px-6 py-2 text-sm font-semibold text-[rgba(232,243,255,0.5)]"}
          >
            导入
          </button>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-white">导入预览</h2>
        {parsed.rows.length ? (
          <div className="overflow-x-auto rounded-2xl border border-[rgba(91,189,247,0.18)] bg-[#0a1b31]/85">
            <table className="min-w-full text-left text-sm text-[rgba(232,243,255,0.88)]">
              <thead className="bg-[rgba(91,189,247,0.12)] text-[rgba(232,243,255,0.9)]">
                <tr>
                  {parsed.headers.map((header) => (
                    <th key={header} className="px-4 py-3 font-semibold">{header || "-"}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsed.rows.map((row, idx) => (
                  <tr key={`${row.cells.join("-")}-${idx}`} className="border-t border-[rgba(91,189,247,0.12)]">
                    {parsed.headers.map((_, cellIdx) => (
                      <td key={`${idx}-${cellIdx}`} className="px-4 py-3">
                        {row.cells[cellIdx] || "-"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[rgba(91,189,247,0.3)] bg-[#0a1b31]/70 py-12 text-center text-sm text-[var(--text-secondary)]">
            暂无数据，请先上传 CSV 文件。
          </div>
        )}
      </Card>
    </div>
  );
}
