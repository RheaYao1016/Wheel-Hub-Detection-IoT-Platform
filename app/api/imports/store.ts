import type { ImportBatch, ImportBatchStatus } from "@/types/imports";

type ImportStore = {
  seeded: boolean;
  items: ImportBatch[];
};

const STORE_KEY = "__IMPORT_HISTORY_STORE__";

type GlobalWithStore = typeof globalThis & {
  __IMPORT_HISTORY_STORE__?: ImportStore;
};

const OPERATORS = ["李雷", "韩梅梅", "张伟", "王芳", "赵敏", "刘洋"];

const STATUS_COPY: Record<ImportBatchStatus, string> = {
  成功: "导入成功，已写入数据库",
  失败: "导入失败，已终止流程",
  部分成功: "部分记录导入，存在异常待复核"
};

export function getImportStore(): ImportStore {
  const globalRef = globalThis as GlobalWithStore;
  if (!globalRef.__IMPORT_HISTORY_STORE__) {
    globalRef.__IMPORT_HISTORY_STORE__ = { seeded: false, items: [] };
  }
  const store = globalRef.__IMPORT_HISTORY_STORE__!;
  if (!store.seeded) {
    store.items = buildSeedData();
    store.seeded = true;
  }
  return store;
}

export function listBatches() {
  return getImportStore().items;
}

export function addBatch(batch: ImportBatch) {
  const store = getImportStore();
  store.items = [batch, ...store.items];
}

export function updateBatch(id: string, patch: Partial<ImportBatch>) {
  const store = getImportStore();
  store.items = store.items.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

export function deleteBatch(id: string) {
  const store = getImportStore();
  store.items = store.items.filter((item) => item.id !== id);
}

export function getBatchById(id: string) {
  return getImportStore().items.find((item) => item.id === id) ?? null;
}

function buildSeedData(): ImportBatch[] {
  const now = Date.now();
  const templates: Array<{
    filename: string;
    sizeMB: number;
    rows: number;
    duration: number;
    status: ImportBatchStatus;
    offsetHours: number;
    note?: string;
    errorDetails?: string;
    operator?: string;
  }> = [
    {
      filename: "2025-03-12-shiftA.csv",
      sizeMB: 2.3,
      rows: 5200,
      duration: 8800,
      status: "成功",
      offsetHours: 4,
      note: "夜班导入完毕"
    },
    {
      filename: "2025-03-12-recheck.csv",
      sizeMB: 1.1,
      rows: 1900,
      duration: 5100,
      status: "部分成功",
      offsetHours: 10,
      note: "存在 8 条待复核",
      errorDetails: "校验失败行号：233、455、732 等"
    },
    {
      filename: "2025-03-11-morning.csv",
      sizeMB: 2.8,
      rows: 6100,
      duration: 10200,
      status: "成功",
      offsetHours: 30,
      note: "按计划批量入库"
    },
    {
      filename: "2025-03-10-lab.csv",
      sizeMB: 0.9,
      rows: 1200,
      duration: 4200,
      status: "失败",
      offsetHours: 45,
      note: "CSV 列缺失",
      errorDetails: "缺少 diameter, center 列，已终止导入"
    },
    {
      filename: "2025-03-10-shiftC.csv",
      sizeMB: 1.7,
      rows: 3500,
      duration: 6900,
      status: "成功",
      offsetHours: 50,
      note: "人工抽检通过"
    },
    {
      filename: "2025-03-09-trace.csv",
      sizeMB: 3.1,
      rows: 7500,
      duration: 11800,
      status: "部分成功",
      offsetHours: 66,
      note: "PCD 异常 5 条",
      errorDetails: "PCD 超差 5 条记录，需人工确认"
    }
  ];

  return templates.map((tpl, index) => {
    const importedAt = new Date(now - tpl.offsetHours * 60 * 60 * 1000).toISOString();
    const operator = tpl.operator ?? OPERATORS[index % OPERATORS.length];
    return {
      id: `IMP-${importedAt.slice(0, 10).replace(/-/g, "")}-${String(index + 1).padStart(3, "0")}`,
      filename: tpl.filename,
      size: Math.round(tpl.sizeMB * 1024 * 1024),
      rows: tpl.rows,
      durationMs: tpl.duration,
      status: tpl.status,
      importedAt,
      importedBy: operator,
      note: tpl.note,
      errorDetails: tpl.errorDetails,
      log: buildLog(tpl.status, operator, tpl.filename, importedAt, tpl.errorDetails)
    } satisfies ImportBatch;
  });
}

function buildLog(status: ImportBatchStatus, operator: string, filename: string, importedAt: string, errorDetails?: string) {
  const lines = [
    `[${importedAt}] ${operator} 提交导入任务：${filename}`,
    `[${importedAt}] 系统校验字段完整性`,
    `[${importedAt}] ${STATUS_COPY[status]}`
  ];
  if (errorDetails) {
    lines.push(`[${importedAt}] 异常详情：${errorDetails}`);
  }
  return lines.join("\n");
}
