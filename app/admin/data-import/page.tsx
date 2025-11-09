"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import Card from "../../components/Layout/Card";
import BackButton from "../../components/Layout/BackButton";
import ExportButton from "@/app/components/Controls/ExportButton";
import type { ImportBatch, ImportBatchStatus, ImportHistoryResponse } from "@/types/imports";
import { useAdminGuard } from "../hooks/useAdminGuard";
import { buildExportFilename, exportToCsv } from "@/app/utils/export";

type PreviewRow = string[];

type HistoryQuery = {
  page: number;
  pageSize: number;
  status: string;
  importer: string;
  search: string;
  start: string;
  end: string;
};

type FilterFormState = Omit<HistoryQuery, "page" | "pageSize">;

const STATUS_OPTIONS: ImportBatchStatus[] = ["成功", "部分成功", "失败"];
const PAGE_SIZE_OPTIONS = [8, 12, 16];

export default function DataImportPage() {
  const ready = useAdminGuard();
  const [filename, setFilename] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [statusInput, setStatusInput] = useState<ImportBatchStatus>("成功");
  const [noteInput, setNoteInput] = useState("");
  const [errorInput, setErrorInput] = useState("");
  const [importerInput, setImporterInput] = useState("李雷");
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyQuery, setHistoryQuery] = useState<HistoryQuery>({
    page: 1,
    pageSize: PAGE_SIZE_OPTIONS[0],
    status: "",
    importer: "",
    search: "",
    start: "",
    end: ""
  });
  const [filterForm, setFilterForm] = useState<FilterFormState>({ status: "", importer: "", search: "", start: "", end: "" });
  const [historyMeta, setHistoryMeta] = useState({ total: 0, page: 1, pageSize: PAGE_SIZE_OPTIONS[0] });
  const [filterOptions, setFilterOptions] = useState<{ importers: string[] }>({ importers: [] });
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [downloadingLogId, setDownloadingLogId] = useState<string | null>(null);

  const preview = useMemo(
    () => ({
      headers,
      rows: previewRows
    }),
    [headers, previewRows]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("admin_user");
    if (stored) {
      setImporterInput(stored);
    }
  }, []);

  const loadHistory = useCallback(
    async (override?: Partial<HistoryQuery>) => {
      setLoadingHistory(true);
      setHistoryError(null);
      const effectiveQuery = override ? { ...historyQuery, ...override } : historyQuery;
      try {
        const qs = buildQueryString(effectiveQuery);
        const url = qs.length ? `/api/imports?${qs}` : "/api/imports";
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("failed");
        }
        const data = (await response.json()) as ImportHistoryResponse;
        setBatches(data.items);
        setHistoryMeta({ total: data.total, page: data.page, pageSize: data.pageSize });
        setFilterOptions({ importers: data.filters.importers });
        setExpandedRow((prev) => (prev && !data.items.some((item) => item.id === prev) ? null : prev));
        if (data.page !== effectiveQuery.page || data.pageSize !== effectiveQuery.pageSize) {
          setHistoryQuery((prev) => {
            const updates: Partial<HistoryQuery> = {};
            if (prev.page !== data.page) {
              updates.page = data.page;
            }
            if (prev.pageSize !== data.pageSize) {
              updates.pageSize = data.pageSize;
            }
            return Object.keys(updates).length ? { ...prev, ...updates } : prev;
          });
        }
      } catch (error) {
        console.error("加载历史导入失败", error);
        setHistoryError("历史记录加载失败，请稍后再试。");
      } finally {
        setLoadingHistory(false);
      }
    },
    [historyQuery]
  );

  useEffect(() => {
    if (!ready) return;
    loadHistory();
  }, [ready, loadHistory]);

  const handleFile = useCallback((fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];
    setFilename(file.name);
    setFileSize(file.size);

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
    try {
      const importedAt = new Date().toISOString();
      const size = fileSize || estimateFileSize(preview.rows, preview.headers.length);
      const durationMs = estimateDuration(preview.rows.length);
      const errorDetails = statusInput === "成功" ? undefined : errorInput || "检测到异常行，请查看日志";
      const payload: ImportBatch = {
        id: generateBatchId(),
        filename: filename || "待命名.csv",
        size,
        rows: preview.rows.length,
        durationMs,
        status: statusInput,
        importedAt,
        importedBy: importerInput || "管理员",
        note: noteInput || undefined,
        errorDetails,
        log: buildImportLog({
          filename: filename || "待命名.csv",
          importedBy: importerInput || "管理员",
          importedAt,
          status: statusInput,
          rows: preview.rows.length,
          durationMs,
          note: noteInput,
          errorDetails,
          headers: preview.headers
        })
      };

      const response = await fetch("/api/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error("提交失败");
      }
      setHistoryQuery((prev) => ({ ...prev, page: 1 }));
      await loadHistory({ page: 1 });
      setFilename("");
      setFileSize(0);
      setHeaders([]);
      setPreviewRows([]);
      setNoteInput("");
      setErrorInput("");
      setStatusInput("成功");
    } catch (error) {
      console.error("导入失败", error);
      alert("导入失败，请稍后再试。");
    } finally {
      setSubmitting(false);
    }
  }, [preview, submitting, fileSize, statusInput, errorInput, filename, importerInput, noteInput, loadHistory]);

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
      const nextStatus = (prompt(`更新状态（可选：${STATUS_OPTIONS.join(" / ")}）`, batch.status) ?? batch.status) as ImportBatchStatus;
      if (!STATUS_OPTIONS.includes(nextStatus)) {
        alert("状态不合法，保持原值。");
        return;
      }
      const note = prompt("备注/说明（可留空）", batch.note ?? "") ?? batch.note ?? "";
      const error =
        nextStatus === "成功"
          ? undefined
          : prompt("错误详情（可留空）", batch.errorDetails ?? "") ?? batch.errorDetails ?? "";

      await fetch(`/api/imports/${batch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, note: note || undefined, errorDetails: error || undefined })
      });
      await loadHistory();
    },
    [loadHistory]
  );

  const handleDownloadLog = useCallback(async (batch: ImportBatch) => {
    try {
      setDownloadingLogId(batch.id);
      const response = await fetch(`/api/imports/${batch.id}/log`);
      if (!response.ok) {
        throw new Error("log");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${batch.id}.log`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("日志下载失败", error);
      alert("日志下载失败，请稍后重试。");
    } finally {
      setDownloadingLogId(null);
    }
  }, []);

  const handleFilterField = useCallback(<K extends keyof FilterFormState>(key: K, value: FilterFormState[K]) => {
    setFilterForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleApplyFilters = useCallback(() => {
    setHistoryQuery((prev) => ({ ...prev, ...filterForm, page: 1 }));
  }, [filterForm]);

  const handleResetFilters = useCallback(() => {
    const reset: FilterFormState = { status: "", importer: "", search: "", start: "", end: "" };
    setFilterForm(reset);
    setHistoryQuery((prev) => ({ ...prev, ...reset, page: 1 }));
  }, []);

  const totalPages = useMemo(() => Math.max(1, Math.ceil((historyMeta.total || 0) / (historyMeta.pageSize || 1))), [historyMeta]);

  const handlePageChange = useCallback(
    (direction: "prev" | "next") => {
      setHistoryQuery((prev) => {
        const nextPage = direction === "prev" ? Math.max(1, prev.page - 1) : Math.min(totalPages, prev.page + 1);
        if (nextPage === prev.page) return prev;
        return { ...prev, page: nextPage };
      });
    },
    [totalPages]
  );

  const handlePageSizeChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    const value = Number(event.target.value);
    setHistoryQuery((prev) => ({ ...prev, pageSize: value, page: 1 }));
  }, []);

  const toggleDetails = useCallback((id: string) => {
    setExpandedRow((prev) => (prev === id ? null : id));
  }, []);

  const handleExportPreview = useCallback(() => {
    if (!previewRows.length) {
      return;
    }
    exportToCsv({
      filename: buildExportFilename("import_preview"),
      header: headers.length ? headers : undefined,
      rows: previewRows
    });
  }, [headers, previewRows]);

  const handleExportHistory = useCallback(() => {
    if (!batches.length) {
      return;
    }
    const header = ["批次号", "文件名", "文件大小", "导入行数", "耗时", "导入人", "导入时间", "状态", "备注", "错误详情"];
    const rows = batches.map((batch) => [
      batch.id,
      batch.filename,
      formatFileSize(batch.size),
      batch.rows,
      formatDuration(batch.durationMs),
      batch.importedBy,
      formatDate(batch.importedAt),
      batch.status,
      batch.note ?? "",
      batch.errorDetails ?? ""
    ]);
    exportToCsv({
      filename: buildExportFilename("import_history"),
      header,
      rows
    });
  }, [batches]);

  if (!ready) {
    return <div className="page-shell pt-0 pb-10 text-sm text-[var(--text-secondary)]">正在校验权限…</div>;
  }

  return (
    <div className="page-shell pt-0 pb-10 space-y-6">
      <BackButton fallbackHref="/admin" />
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-[var(--text-secondary)]">管理员后台 / 数据导入</span>
          <h1 className="text-2xl font-semibold text-white md:text-3xl">数据导入</h1>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">上传 CSV 文件、预览内容并追踪历史批次。</p>
      </div>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-white">上传 CSV</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <label className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[rgba(91,189,247,0.5)] bg-[rgba(91,189,247,0.08)] px-6 py-8 text-center text-sm text-[rgba(232,243,255,0.86)]">
            <input type="file" accept=".csv,text/csv" hidden onChange={(event) => handleFile(event.target.files)} />
            <span className="text-base font-semibold text-white">点击或拖拽 CSV 文件到此处</span>
            <span className="text-xs text-[var(--text-secondary)]">推荐包含编号、尺寸、中心孔、PCD 等字段</span>
            {filename && (
              <span className="text-xs text-[rgba(91,189,247,0.9)]">
                已选择：{filename}（{formatFileSize(fileSize || estimateFileSize(preview.rows, preview.headers.length))}）
              </span>
            )}
          </label>
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">
                导入状态
                <select
                  className="mt-1 w-full rounded-xl border border-[rgba(91,189,247,0.35)] bg-transparent px-3 py-2 text-sm"
                  value={statusInput}
                  onChange={(event) => setStatusInput(event.target.value as ImportBatchStatus)}
                >
                  {STATUS_OPTIONS.map((item) => (
                    <option key={item} value={item} className="bg-[#041629]">
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">
                导入人
                <input
                  className="mt-1 w-full rounded-xl border border-[rgba(91,189,247,0.35)] bg-transparent px-3 py-2 text-sm"
                  value={importerInput}
                  onChange={(event) => setImporterInput(event.target.value)}
                  placeholder="请输入导入人"
                />
              </label>
            </div>
            <label className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">
              备注
              <input
                className="mt-1 w-full rounded-xl border border-[rgba(91,189,247,0.35)] bg-transparent px-3 py-2 text-sm"
                value={noteInput}
                onChange={(event) => setNoteInput(event.target.value)}
                placeholder="可选，填写导入说明"
              />
            </label>
            {statusInput !== "成功" && (
              <label className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">
                错误详情
                <textarea
                  className="mt-1 min-h-[72px] w-full rounded-xl border border-[rgba(255,107,129,0.45)] bg-transparent px-3 py-2 text-sm"
                  value={errorInput}
                  onChange={(event) => setErrorInput(event.target.value)}
                  placeholder="描述失败或部分成功的原因"
                />
              </label>
            )}
            <button
              type="button"
              disabled={!preview.rows.length || submitting}
              onClick={handleImport}
              className={`mt-2 w-full rounded-full px-6 py-2 text-sm font-semibold transition ${
                preview.rows.length
                  ? "bg-gradient-to-r from-[#5bbdf7] to-[#4f82f4] text-[#041629] shadow-[0_10px_24px_rgba(91,189,247,0.3)] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                  : "cursor-not-allowed bg-[rgba(91,189,247,0.1)] text-[rgba(232,243,255,0.5)]"
              }`}
            >
              {submitting ? "导入中..." : "导入"}
            </button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">导入预览</h2>
          <ExportButton onClick={handleExportPreview} disabled={!preview.rows.length} />
        </div>
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
        <div className="mb-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">导入历史记录</h2>
              <div className="mt-1 text-xs text-[var(--text-secondary)]">
                共 {historyMeta.total} 条记录 · 每页 {historyMeta.pageSize} 条
              </div>
            </div>
            <ExportButton onClick={handleExportHistory} disabled={!batches.length} />
          </div>
          <div className="grid gap-3 lg:grid-cols-[repeat(6,minmax(0,1fr))]">
            <input
              className="rounded-xl border border-[rgba(91,189,247,0.25)] bg-transparent px-3 py-2 text-sm"
              placeholder="按文件名关键字"
              value={filterForm.search}
              onChange={(event) => handleFilterField("search", event.target.value)}
            />
            <select
              className="rounded-xl border border-[rgba(91,189,247,0.25)] bg-transparent px-3 py-2 text-sm"
              value={filterForm.status}
              onChange={(event) => handleFilterField("status", event.target.value)}
            >
              <option value="" className="bg-[#041629]">
                状态（全部）
              </option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status} className="bg-[#041629]">
                  {status}
                </option>
              ))}
            </select>
            <select
              className="rounded-xl border border-[rgba(91,189,247,0.25)] bg-transparent px-3 py-2 text-sm"
              value={filterForm.importer}
              onChange={(event) => handleFilterField("importer", event.target.value)}
            >
              <option value="" className="bg-[#041629]">
                导入人（全部）
              </option>
              {filterOptions.importers.map((operator) => (
                <option key={operator} value={operator} className="bg-[#041629]">
                  {operator}
                </option>
              ))}
            </select>
            <input
              type="date"
              className="rounded-xl border border-[rgba(91,189,247,0.25)] bg-transparent px-3 py-2 text-sm"
              value={filterForm.start}
              onChange={(event) => handleFilterField("start", event.target.value)}
            />
            <input
              type="date"
              className="rounded-xl border border-[rgba(91,189,247,0.25)] bg-transparent px-3 py-2 text-sm"
              value={filterForm.end}
              onChange={(event) => handleFilterField("end", event.target.value)}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleApplyFilters}
                className="flex-1 rounded-full bg-gradient-to-r from-[#5bbdf7] to-[#4f82f4] px-3 py-2 text-sm font-semibold text-[#041629]"
              >
                查询
              </button>
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex-1 rounded-full border border-[rgba(91,189,247,0.35)] px-3 py-2 text-sm text-[rgba(232,243,255,0.9)]"
              >
                重置
              </button>
            </div>
          </div>
        </div>
        {loadingHistory ? (
          <div className="py-10 text-center text-sm text-[var(--text-secondary)]">正在加载历史导入记录…</div>
        ) : historyError ? (
          <div className="rounded-2xl border border-dashed border-[rgba(255,107,129,0.45)] bg-[#2f1d24]/60 py-10 text-center text-sm text-[#ff6b81]">
            {historyError}
          </div>
        ) : batches.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[rgba(91,189,247,0.3)] bg-[#0a1b31]/70 py-12 text-center text-sm text-[var(--text-secondary)]">
            暂无符合条件的历史导入记录。
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[rgba(91,189,247,0.18)] bg-[#0a1b31]/85">
            <table className="min-w-full border-collapse text-left text-sm text-[rgba(232,243,255,0.88)]">
              <thead className="sticky top-0 bg-[rgba(91,189,247,0.12)] text-[rgba(232,243,255,0.9)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">文件名</th>
                  <th className="px-4 py-3 font-semibold">文件大小</th>
                  <th className="px-4 py-3 font-semibold">导入行数</th>
                  <th className="px-4 py-3 font-semibold">耗时</th>
                  <th className="px-4 py-3 font-semibold">导入人</th>
                  <th className="px-4 py-3 font-semibold">导入时间</th>
                  <th className="px-4 py-3 font-semibold">状态</th>
                  <th className="px-4 py-3 font-semibold">备注 / 错误</th>
                  <th className="px-4 py-3 text-right font-semibold">操作</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((batch) => (
                  <Fragment key={batch.id}>
                    <tr className="border-t border-[rgba(91,189,247,0.12)]">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white">{batch.filename}</div>
                        <div className="text-xs text-[var(--text-secondary)]">批次：{batch.id}</div>
                      </td>
                      <td className="px-4 py-3">{formatFileSize(batch.size)}</td>
                      <td className="px-4 py-3">{batch.rows}</td>
                      <td className="px-4 py-3">{formatDuration(batch.durationMs)}</td>
                      <td className="px-4 py-3">{batch.importedBy}</td>
                      <td className="px-4 py-3">{formatDate(batch.importedAt)}</td>
                      <td className="px-4 py-3">
                        <span className={`status-pill ${statusClass(batch.status)}`}>{batch.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        {batch.note || batch.errorDetails ? (
                          <button
                            type="button"
                            onClick={() => toggleDetails(batch.id)}
                            className="rounded-full border border-[rgba(91,189,247,0.35)] px-3 py-1 text-xs text-[rgba(232,243,255,0.9)]"
                          >
                            {expandedRow === batch.id ? "收起" : "查看"}
                          </button>
                        ) : (
                          <span className="text-[rgba(232,243,255,0.65)]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            className="rounded-full border border-[rgba(91,189,247,0.35)] px-3 py-1 text-xs text-[rgba(232,243,255,0.9)] transition hover:border-[rgba(91,189,247,0.55)]"
                            onClick={() => handleEdit(batch)}
                          >
                            修改
                          </button>
                          <button
                            type="button"
                            className="rounded-full border border-[rgba(91,189,247,0.35)] px-3 py-1 text-xs text-[rgba(232,243,255,0.9)]"
                            disabled={downloadingLogId === batch.id}
                            onClick={() => handleDownloadLog(batch)}
                          >
                            {downloadingLogId === batch.id ? "下载中" : "日志"}
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
                    {expandedRow === batch.id && (batch.note || batch.errorDetails) && (
                      <tr>
                        <td colSpan={9} className="px-4 pb-4 pt-0">
                          <div className="rounded-2xl border border-[rgba(91,189,247,0.2)] bg-[#071327]/70 px-4 py-3 text-xs leading-relaxed text-[rgba(232,243,255,0.9)]">
                            {batch.note && (
                              <p>
                                <span className="text-[var(--accent)]">备注：</span>
                                {batch.note}
                              </p>
                            )}
                            {batch.errorDetails && (
                              <p className="mt-2 text-[#ff9aa2]">
                                <span>错误：</span>
                                {batch.errorDetails}
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
            <button
              type="button"
              onClick={() => handlePageChange("prev")}
              disabled={historyMeta.page <= 1 || loadingHistory}
              className="rounded-full border border-[rgba(91,189,247,0.35)] px-4 py-1 text-xs disabled:opacity-50"
            >
              上一页
            </button>
            <span>
              第 {historyMeta.page} / {totalPages} 页
            </span>
            <button
              type="button"
              onClick={() => handlePageChange("next")}
              disabled={historyMeta.page >= totalPages || loadingHistory}
              className="rounded-full border border-[rgba(91,189,247,0.35)] px-4 py-1 text-xs disabled:opacity-50"
            >
              下一页
            </button>
          </div>
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <span>每页展示</span>
            <select
              value={historyQuery.pageSize}
              onChange={handlePageSizeChange}
              className="rounded-xl border border-[rgba(91,189,247,0.25)] bg-transparent px-3 py-1 text-sm"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size} className="bg-[#041629]">
                  {size}
                </option>
              ))}
            </select>
            <span>条</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

function normalizeCsv(raw: string) {
  return raw.replace(/\uFEFF/g, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function buildQueryString(state: HistoryQuery) {
  const params = new URLSearchParams();
  params.set("page", String(state.page));
  params.set("pageSize", String(state.pageSize));
  if (state.status) params.set("status", state.status);
  if (state.importer) params.set("importer", state.importer);
  if (state.search) params.set("q", state.search);
  if (state.start) params.set("start", state.start);
  if (state.end) params.set("end", state.end);
  return params.toString();
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

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("zh-CN", { hour12: false });
}

function formatDuration(durationMs: number) {
  if (!durationMs || Number.isNaN(durationMs)) return "-";
  if (durationMs < 1000) return `${durationMs} ms`;
  return `${(durationMs / 1000).toFixed(1)} s`;
}

function formatFileSize(size: number) {
  if (!size || Number.isNaN(size)) return "-";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function estimateFileSize(rows: PreviewRow[], columnCount: number) {
  if (!rows.length || !columnCount) return 0;
  const avgCellLength = rows.reduce((sum, row) => sum + row.join("").length, 0) / rows.length;
  return Math.round(avgCellLength * columnCount * rows.length);
}

function estimateDuration(rowCount: number) {
  if (!rowCount) return 0;
  const base = 1200;
  const step = Math.min(60, Math.max(15, Math.floor(rowCount / 100)));
  return base + step * rowCount;
}

function buildImportLog(params: {
  filename: string;
  importedBy: string;
  importedAt: string;
  status: ImportBatchStatus;
  rows: number;
  durationMs: number;
  note?: string;
  errorDetails?: string;
  headers: string[];
}) {
  const { filename, importedBy, importedAt, status, rows, durationMs, note, errorDetails, headers } = params;
  const readable = new Date(importedAt).toLocaleString("zh-CN", { hour12: false });
  const lines = [
    `[${readable}] ${importedBy} 触发导入：${filename}`,
    `[${readable}] 预览列：${headers.join(", ") || "—"}`,
    `[${readable}] 已写入 ${rows} 行，耗时 ${(durationMs / 1000).toFixed(1)}s`,
    `[${readable}] 状态：${status}`
  ];
  if (note) {
    lines.push(`[${readable}] 备注：${note}`);
  }
  if (errorDetails) {
    lines.push(`[${readable}] 错误：${errorDetails}`);
  }
  return lines.join("\n");
}

function generateBatchId() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(100 + Math.random() * 900);
  return `IMP-${date}-${random}`;
}

function statusClass(status: ImportBatchStatus) {
  if (status === "成功") return "status-success";
  if (status === "失败") return "status-danger";
  return "status-warning";
}
