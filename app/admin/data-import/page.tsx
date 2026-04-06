"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import BackButton from "../../components/Layout/BackButton";
import Card from "../../components/Layout/Card";
import ExportButton from "@/app/components/Controls/ExportButton";
import { buildExportFilename, exportToCsv } from "@/app/utils/export";
import { clearAuthSession } from "@/lib/auth-session";
import { PlatformAuthError, requestPlatformBlob, requestPlatformJson } from "@/lib/dashboard-client";
import type { ImportBatch, ImportBatchStatus, ImportHistoryResponse } from "@/types/imports";
import { useAdminGuard } from "../hooks/useAdminGuard";

const STATUS_OPTIONS: ImportBatchStatus[] = ["成功", "部分成功", "失败"];

type ToastState = { tone: "success" | "error"; message: string } | null;
type EditState = { id: string; filename: string; status: ImportBatchStatus; note: string; errorDetails: string } | null;

export default function DataImportPage() {
  const router = useRouter();
  const ready = useAdminGuard();
  const [filename, setFilename] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [status, setStatus] = useState<ImportBatchStatus>("成功");
  const [importer, setImporter] = useState("管理员");
  const [note, setNote] = useState("");
  const [errorDetails, setErrorDetails] = useState("");
  const [history, setHistory] = useState<ImportBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>(null);
  const [deleteState, setDeleteState] = useState<ImportBatch | null>(null);

  const showToast = useCallback((message: string, tone: "success" | "error" = "success") => setToast({ message, tone }), []);
  const handleAuthError = useCallback(() => {
    clearAuthSession();
    router.replace("/login");
  }, [router]);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await requestPlatformJson<ImportHistoryResponse>("/admin/imports?page=1&pageSize=12", "/api/imports?page=1&pageSize=12");
      setHistory(data.items);
    } catch (error) {
      if (error instanceof PlatformAuthError) return handleAuthError();
      console.error(error);
      showToast("历史记录加载失败。", "error");
    } finally {
      setLoading(false);
    }
  }, [handleAuthError, showToast]);

  useEffect(() => {
    if (!ready) return;
    setImporter(window.localStorage.getItem("admin_user") || "管理员");
    loadHistory();
  }, [loadHistory, ready]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const previewReady = useMemo(() => rows.length > 0, [rows]);

  const handleFile = (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    setFilename(file.name);
    setFileSize(file.size);
    const reader = new FileReader();
    reader.onload = () => {
      const lines = String(reader.result ?? "").replace(/\uFEFF/g, "").replace(/\r/g, "").split("\n").filter(Boolean);
      const parsed = lines.map((line) => line.split(",").map((cell) => cell.trim()));
      setHeaders(parsed[0] ?? []);
      setRows(parsed.slice(1, 41));
    };
    reader.readAsText(file, "utf-8");
  };

  const resetForm = () => {
    setFilename("");
    setFileSize(0);
    setHeaders([]);
    setRows([]);
    setStatus("成功");
    setNote("");
    setErrorDetails("");
  };

  const handleImport = async () => {
    if (!previewReady || submitting) return;
    setSubmitting(true);
    const importedAt = new Date().toISOString().slice(0, 19).replace("T", " ");
    const batch: ImportBatch = {
      id: `IMP-${Date.now()}`,
      filename: filename || "未命名.csv",
      size: fileSize,
      rows: rows.length,
      durationMs: 800 + rows.length * 16,
      status,
      importedAt,
      importedBy: importer || "管理员",
      note: note || undefined,
      errorDetails: status === "成功" ? undefined : errorDetails || "检测到异常，请查看日志。",
      log: [`[${importedAt}] ${importer} 提交导入任务：${filename || "未命名.csv"}`, `[${importedAt}] 状态：${status}`].join("\n"),
    };
    try {
      await requestPlatformJson<ImportBatch>("/admin/imports", "/api/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batch),
      });
      resetForm();
      await loadHistory();
      showToast("导入批次已创建。");
    } catch (error) {
      if (error instanceof PlatformAuthError) return handleAuthError();
      console.error(error);
      showToast("导入失败，请稍后重试。", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadLog = async (item: ImportBatch) => {
    try {
      const blob = await requestPlatformBlob(`/admin/imports/${item.id}/log`, `/api/imports/${item.id}/log`);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${item.id}.log`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      showToast(`已导出 ${item.id} 日志。`);
    } catch (error) {
      if (error instanceof PlatformAuthError) return handleAuthError();
      console.error(error);
      showToast("日志下载失败。", "error");
    }
  };

  const saveEdit = async () => {
    if (!editState) return;
    try {
      await requestPlatformJson(`/admin/imports/${editState.id}`, `/api/imports/${editState.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: editState.status,
          note: editState.note || undefined,
          errorDetails: editState.status === "成功" ? undefined : editState.errorDetails || undefined,
        }),
      });
      setEditState(null);
      await loadHistory();
      showToast("批次状态已更新。");
    } catch (error) {
      if (error instanceof PlatformAuthError) return handleAuthError();
      console.error(error);
      showToast("更新失败。", "error");
    }
  };

  const confirmDelete = async () => {
    if (!deleteState) return;
    try {
      await requestPlatformJson(`/admin/imports/${deleteState.id}`, `/api/imports/${deleteState.id}`, { method: "DELETE" });
      setDeleteState(null);
      await loadHistory();
      showToast("记录已删除。");
    } catch (error) {
      if (error instanceof PlatformAuthError) return handleAuthError();
      console.error(error);
      showToast("删除失败。", "error");
    }
  };

  return ready ? (
    <div className="page-shell space-y-6 pt-0 pb-10">
      <BackButton fallbackHref="/admin" />
      <div>
        <span className="text-xs text-[var(--text-secondary)]">管理员后台 / 数据导入</span>
        <h1 className="mt-2 text-3xl font-semibold text-white">数据导入中心</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">去掉了演示弹窗，改为正式的批次编辑、删除确认和导入日志管理。</p>
      </div>

      <Card>
        <div className="grid gap-6 md:grid-cols-2">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[rgba(91,189,247,0.45)] bg-[rgba(91,189,247,0.08)] px-6 py-8 text-center">
            <input hidden type="file" accept=".csv,text/csv" onChange={(event) => handleFile(event.target.files)} />
            <strong className="text-white">点击或拖拽 CSV 文件到这里</strong>
            <span className="text-xs text-[var(--text-secondary)]">推荐字段：编号、直径、中心孔、PCD、检测结果</span>
            {filename ? <span className="text-xs text-[var(--accent)]">{filename} / {(fileSize / 1024).toFixed(1)} KB</span> : null}
          </label>
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <input className="rounded-2xl border border-[rgba(91,189,247,0.25)] bg-transparent px-4 py-3" value={importer} onChange={(event) => setImporter(event.target.value)} placeholder="导入人" />
              <select className="rounded-2xl border border-[rgba(91,189,247,0.25)] bg-transparent px-4 py-3" value={status} onChange={(event) => setStatus(event.target.value as ImportBatchStatus)}>{STATUS_OPTIONS.map((item) => <option key={item} value={item} className="bg-[#041629]">{item}</option>)}</select>
            </div>
            <input className="w-full rounded-2xl border border-[rgba(91,189,247,0.25)] bg-transparent px-4 py-3" value={note} onChange={(event) => setNote(event.target.value)} placeholder="批次备注" />
            {status !== "成功" ? <textarea className="min-h-[92px] w-full rounded-2xl border border-[rgba(255,107,129,0.25)] bg-transparent px-4 py-3" value={errorDetails} onChange={(event) => setErrorDetails(event.target.value)} placeholder="错误详情" /> : null}
            <button type="button" disabled={!previewReady || submitting} onClick={handleImport} className="enterprise-primary-button w-full justify-center">{submitting ? "导入中..." : "确认导入"}</button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">预览数据</h2>
          <ExportButton onClick={() => exportToCsv({ filename: buildExportFilename("import_preview"), header: headers, rows })} disabled={!previewReady} />
        </div>
        {previewReady ? (
          <div className="overflow-x-auto rounded-2xl border border-[rgba(91,189,247,0.18)] bg-[#0a1b31]/85">
            <table className="min-w-full text-left text-sm text-[rgba(232,243,255,0.88)]">
              <thead className="bg-[rgba(91,189,247,0.12)]"><tr>{headers.map((head) => <th key={head} className="px-4 py-3">{head || "-"}</th>)}</tr></thead>
              <tbody>{rows.map((row, rowIndex) => <tr key={`${rowIndex}-${row.join("-")}`} className="border-t border-[rgba(91,189,247,0.12)]">{headers.map((_, index) => <td key={`${rowIndex}-${index}`} className="px-4 py-3">{row[index] || "-"}</td>)}</tr>)}</tbody>
            </table>
          </div>
        ) : <div className="empty-state"><span>+</span>暂无预览数据，请先上传 CSV 文件。</div>}
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">导入历史</h2>
          <ExportButton onClick={() => exportToCsv({ filename: buildExportFilename("import_history"), header: ["批次号", "文件名", "状态", "导入人", "导入时间"], rows: history.map((item) => [item.id, item.filename, item.status, item.importedBy, item.importedAt]) })} disabled={!history.length} />
        </div>
        {loading ? <div className="loading-state">正在加载历史记录...</div> : (
          <div className="space-y-3">
            {history.map((item) => (
              <div key={item.id} className="rounded-2xl border border-[rgba(91,189,247,0.15)] bg-[rgba(7,19,39,0.7)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <strong className="text-white">{item.filename}</strong>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">{item.id} / {item.importedBy} / {item.importedAt}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`status-pill ${item.status === "成功" ? "status-success" : item.status === "失败" ? "status-danger" : "status-warning"}`}>{item.status}</span>
                    <button type="button" className="enterprise-secondary-button px-4 py-2 text-xs" onClick={() => setExpandedId((prev) => prev === item.id ? null : item.id)}>{expandedId === item.id ? "收起" : "详情"}</button>
                    <button type="button" className="enterprise-secondary-button px-4 py-2 text-xs" onClick={() => setEditState({ id: item.id, filename: item.filename, status: item.status, note: item.note ?? "", errorDetails: item.errorDetails ?? "" })}>编辑</button>
                    <button type="button" className="enterprise-secondary-button px-4 py-2 text-xs" onClick={() => handleDownloadLog(item)}>日志</button>
                    <button type="button" className="rounded-full border border-[rgba(255,107,129,0.35)] px-4 py-2 text-xs text-[#ff9aa2]" onClick={() => setDeleteState(item)}>删除</button>
                  </div>
                </div>
                {expandedId === item.id ? <div className="mt-4 rounded-2xl bg-[rgba(255,255,255,0.03)] p-4 text-sm text-[var(--text-secondary)]"><p>备注：{item.note || "无"}</p><p className="mt-2">错误：{item.errorDetails || "无"}</p></div> : null}
              </div>
            ))}
          </div>
        )}
      </Card>

      {editState ? <Modal title="更新导入批次" onClose={() => setEditState(null)} onConfirm={saveEdit} confirmLabel="保存更新">
        <p className="mb-4 text-sm text-[var(--text-secondary)]">{editState.filename}</p>
        <select className="mb-3 w-full rounded-2xl border border-[rgba(91,189,247,0.25)] bg-transparent px-4 py-3" value={editState.status} onChange={(event) => setEditState((current) => current ? { ...current, status: event.target.value as ImportBatchStatus } : current)}>{STATUS_OPTIONS.map((item) => <option key={item} value={item} className="bg-[#041629]">{item}</option>)}</select>
        <textarea className="mb-3 min-h-[92px] w-full rounded-2xl border border-[rgba(91,189,247,0.25)] bg-transparent px-4 py-3" value={editState.note} onChange={(event) => setEditState((current) => current ? { ...current, note: event.target.value } : current)} placeholder="备注" />
        {editState.status !== "成功" ? <textarea className="min-h-[92px] w-full rounded-2xl border border-[rgba(255,107,129,0.25)] bg-transparent px-4 py-3" value={editState.errorDetails} onChange={(event) => setEditState((current) => current ? { ...current, errorDetails: event.target.value } : current)} placeholder="错误详情" /> : null}
      </Modal> : null}

      {deleteState ? <Modal title="确认删除导入记录" onClose={() => setDeleteState(null)} onConfirm={confirmDelete} confirmLabel="确认删除" danger>
        <p className="text-sm leading-7 text-[var(--text-secondary)]">即将删除 <span className="text-white">{deleteState.filename}</span>，批次号为 <span className="text-white">{deleteState.id}</span>。该操作会从后端历史记录中移除当前批次。</p>
      </Modal> : null}

      {toast ? <div className={`floating-toast ${toast.tone}`}>{toast.message}</div> : null}
    </div>
  ) : null;
}

function Modal({ title, children, onClose, onConfirm, confirmLabel, danger = false }: { title: string; children: ReactNode; onClose: () => void; onConfirm: () => void; confirmLabel: string; danger?: boolean }) {
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(3,9,18,0.72)] px-4 backdrop-blur-sm"><div className="w-full max-w-xl rounded-[28px] border border-[rgba(91,189,247,0.18)] bg-[var(--panel-bg-strong)] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.45)]"><div className="mb-4 flex items-center justify-between gap-4"><h2 className="text-2xl font-semibold text-white">{title}</h2><button type="button" onClick={onClose} className="rounded-full border border-[rgba(91,189,247,0.22)] px-3 py-1 text-sm text-[var(--text-secondary)]">关闭</button></div>{children}<div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="enterprise-secondary-button px-5 py-2">取消</button><button type="button" onClick={onConfirm} className={danger ? "rounded-full bg-[linear-gradient(90deg,rgba(255,107,129,0.96),rgba(225,71,108,0.96))] px-5 py-2 text-sm font-semibold text-white" : "enterprise-primary-button px-5 py-2"}>{confirmLabel}</button></div></div></div>;
}
