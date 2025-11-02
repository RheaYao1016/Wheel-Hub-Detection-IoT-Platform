"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Card from "../../components/Layout/Card";
import type { ImportBatch } from "@/types/imports";
import { useAdminGuard } from "../hooks/useAdminGuard";

type PreviewRow = string[];

const STATUS_OPTIONS: ImportBatch["status"][] = ["成功", "部分成功", "失败"];

export default function DataImportPage() {
  const [filename, setFilename] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const ready = useAdminGuard();
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    const response = await fetch("/api/imports");
    const data = (await response.json()) as ImportBatch[];
    setBatches(data);
    setLoadingHistory(false);
  }, []);

  useEffect(() => {
    if (!ready) return;
    loadHistory();
  }, [ready, loadHistory]);

  const preview = useMemo(
    () => ({
      headers,
      rows: previewRows
    }),
    [headers, previewRows]
  );

  const handleFile = useCallback((fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];
    setFilename(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const content = normalizeCsv(String(reader.result ?? ""));
      const lines = content.split("\n").filter((line) => line.trim().length > 0);
      if (!lines.length) {
        setHeaders([]);
        setPreviewRows([]);
        return;
      }
      const headerCells = parseCsvLine(lines[0]);
      const dataRows = lines.slice(1, 51).map(parseCsvLine);
      setHeaders(headerCells);
      setPreviewRows(dataRows);
    };
    reader.readAsText(file, "utf-8");
  }, []);

  const handleImport = useCallback(async () => {
    if (!preview.rows.length || submitting) {
      return;
    }

    setSubmitting(true);

    const batch: ImportBatch = {
      id: generateBatchId(),
      filename: filename || "待命名.csv",
      rows: preview.rows.length,
      status: "成功",
      createdAt: new Date().toISOString()
    };

    await fetch("/api/imports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(batch)
    });

    await loadHistory();
    setSubmitting(false);
    setFilename("");
    setHeaders([]);
    setPreviewRows([]);
  }, [filename, preview.rows.length, submitting, loadHistory]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("确认删除该导入记录？")) return;
      await fetch(`/api/imports/${id}`, { method: "DELETE" });
      await loadHistory();
    },
    [loadHistory]
  );

  const handleEdit = useCallback(
    async (batch: ImportBatch) => {
      const nextStatus =
        prompt(`更新状态（可选：${STATUS_OPTIONS.join(" / ")}）`, batch.status) ?? batch.status;
      const note = prompt("备注/说明（可留空）", batch.note ?? "");

      if (!STATUS_OPTIONS.includes(nextStatus as ImportBatch["status"])) {
        alert("状态不合法，保持原值。");
        return;
      }

      await fetch(`/api/imports/${batch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, note: note ?? "" })
      });
      await loadHistory();
    },
    [loadHistory]
  );

  if (!ready) {
    return <div className="page-shell pt-0 pb-10 text-sm text-[var(--text-secondary)]">正在校验权限…</div>;
  }

  return (
    <div className="page-shell pt-0 pb-10 space-y-6">
      <div className="flex flex-col gap-2">
        <span className="text-xs text-[var(--text-secondary)]">管理员后台 / 数据导入</span>
        <h1 className="text-2xl font-semibold text-white md:text-3xl">数据导入</h1>
        <p className="text-sm text-[var(--text-secondary)]">上传 CSV 文件、预览内容并追踪历史批次。</p>
      </div>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-white">上传 CSV</h2>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[rgba(91,189,247,0.5)] bg-[rgba(91,189,247,0.08)] px-6 py-10 text-center text-sm text-[rgba(232,243,255,0.86)]">
            <input type="file" accept=".csv,text/csv" hidden onChange={(event) => handleFile(event.target.files)} />
            <span className="text-base font-semibold text-white">点击或拖拽 CSV 文件到此处</span>
            <span className="text-xs text-[var(--text-secondary)]">推荐包含编号、尺寸、中心孔、PCD 等字段</span>
            {filename && <span className="text-xs text-[rgba(91,189,247,0.9)]">已选择：{filename}</span>}
          </label>
          <button
            type="button"
            disabled={!preview.rows.length || submitting}
            onClick={handleImport}
            className={
              preview.rows.length
                ? "rounded-full bg-gradient-to-r from-[#5bbdf7] to-[#4f82f4] px-6 py-2 text-sm font-semibold text-[#041629] shadow-[0_10px_24px_rgba(91,189,247,0.3)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                : "cursor-not-allowed rounded-full bg-[rgba(91,189,247,0.1)] px-6 py-2 text-sm font-semibold text-[rgba(232,243,255,0.5)]"
            }
          >
            导入
          </button>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-white">导入预览</h2>
        {preview.rows.length ? (
          <div className="overflow-x-auto rounded-2xl border border-[rgba(91,189,247,0.18)] bg-[#0a1b31]/85">
            <table className="min-w-full border-collapse text-left text-sm text-[rgba(232,243,255,0.88)]">
              <thead className="sticky top-0 bg-[rgba(91,189,247,0.12)] text-[rgba(232,243,255,0.9)]">
                <tr>
                  {preview.headers.map((header) => (
                    <th key={header} className="px-4 py-3 font-semibold">
                      {header || "-"}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, rowIndex) => (
                  <tr key={`${row.join("-")}-${rowIndex}`} className="border-t border-[rgba(91,189,247,0.12)]">
                    {preview.headers.map((_, cellIndex) => (
                      <td key={`${rowIndex}-${cellIndex}`} className="px-4 py-3">
                        {row[cellIndex] || "-"}
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

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">历史导入记录</h2>
          <button
            type="button"
            onClick={loadHistory}
            className="rounded-full border border-[rgba(91,189,247,0.35)] px-3 py-1 text-xs text-[rgba(232,243,255,0.85)] transition hover:border-[rgba(91,189,247,0.55)]"
          >
            刷新
          </button>
        </div>
        {loadingHistory ? (
          <div className="py-10 text-center text-sm text-[var(--text-secondary)]">正在加载历史导入记录…</div>
        ) : batches.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[rgba(91,189,247,0.3)] bg-[#0a1b31]/70 py-12 text-center text-sm text-[var(--text-secondary)]">
            暂无历史导入记录。
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[rgba(91,189,247,0.18)] bg-[#0a1b31]/85">
            <table className="min-w-full border-collapse text-left text-sm text-[rgba(232,243,255,0.88)]">
              <thead className="sticky top-0 bg-[rgba(91,189,247,0.12)] text-[rgba(232,243,255,0.9)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">批次号</th>
                  <th className="px-4 py-3 font-semibold">导入时间</th>
                  <th className="px-4 py-3 font-semibold">文件名</th>
                  <th className="px-4 py-3 font-semibold">行数</th>
                  <th className="px-4 py-3 font-semibold">状态</th>
                  <th className="px-4 py-3 font-semibold">备注</th>
                  <th className="px-4 py-3 text-right font-semibold">操作</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((batch) => (
                  <tr key={batch.id} className="border-t border-[rgba(91,189,247,0.12)]">
                    <td className="px-4 py-3 font-mono text-xs text-white">{batch.id}</td>
                    <td className="px-4 py-3">{formatDate(batch.createdAt)}</td>
                    <td className="px-4 py-3">{batch.filename}</td>
                    <td className="px-4 py-3">{batch.rows}</td>
                    <td className="px-4 py-3">
                      <span className={`status-pill ${statusClass(batch.status)}`}>{batch.status}</span>
                    </td>
                    <td className="px-4 py-3 text-[rgba(232,243,255,0.85)]">{batch.note && batch.note.length ? batch.note : "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="rounded-full border border-[rgba(91,189,247,0.35)] px-3 py-1 text-xs text-[rgba(232,243,255,0.9)] transition hover:border-[rgba(91,189,247,0.55)]"
                          onClick={() => handleEdit(batch)}
                        >
                          修改
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-[rgba(255,107,129,0.4)] px-3 py-1 text-xs text-[#ff6b81] transition hover:border-[rgba(255,107,129,0.65)]"
                          onClick={() => handleDelete(batch.id)}
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function normalizeCsv(raw: string) {
  return raw.replace(/\uFEFF/g, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (quoted) {
      if (char === "\"") {
        if (line[i + 1] === "\"") {
          current += "\"";
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        current += char;
      }
    } else if (char === ",") {
      result.push(current);
      current = "";
    } else if (char === "\"") {
      quoted = true;
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

function generateBatchId() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(100 + Math.random() * 900);
  return `IMP-${date}-${random}`;
}

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("zh-CN", { hour12: false });
}

function statusClass(status: ImportBatch["status"]) {
  if (status === "成功") return "status-success";
  if (status === "失败") return "status-danger";
  return "status-warning";
}
