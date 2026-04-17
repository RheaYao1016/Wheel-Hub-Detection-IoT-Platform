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

const STATUS_COPY: Record<string, string> = {
  SUCCESS: "Import succeeded and records were committed.",
  FAILED: "Import failed and the pipeline was aborted.",
  PARTIAL_SUCCESS: "Import partially succeeded and requires review.",
  成功: "Import succeeded and records were committed.",
  失败: "Import failed and the pipeline was aborted.",
  部分成功: "Import partially succeeded and requires review.",
};

export function getImportStore(): ImportStore {
  const globalRef = globalThis as GlobalWithStore;
  if (!globalRef[STORE_KEY]) {
    globalRef[STORE_KEY] = { seeded: false, items: [] };
  }
  const store = globalRef[STORE_KEY]!;
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
      status: "SUCCESS",
      offsetHours: 4,
      note: "Night-shift import completed.",
    },
    {
      filename: "2025-03-12-recheck.csv",
      sizeMB: 1.1,
      rows: 1900,
      duration: 5100,
      status: "PARTIAL_SUCCESS",
      offsetHours: 10,
      note: "8 rows require recheck.",
      errorDetails: "Validation failed for rows 133, 255, and 432.",
    },
    {
      filename: "2025-03-11-morning.csv",
      sizeMB: 2.8,
      rows: 6100,
      duration: 10200,
      status: "SUCCESS",
      offsetHours: 30,
      note: "Scheduled morning import.",
    },
    {
      filename: "2025-03-10-lab.csv",
      sizeMB: 0.9,
      rows: 1200,
      duration: 4200,
      status: "FAILED",
      offsetHours: 45,
      note: "CSV missing required columns.",
      errorDetails: "Missing columns: diameter, center_hole.",
    },
    {
      filename: "2025-03-10-shiftC.csv",
      sizeMB: 1.7,
      rows: 3500,
      duration: 6900,
      status: "SUCCESS",
      offsetHours: 50,
      note: "Manual sampling passed.",
    },
    {
      filename: "2025-03-09-trace.csv",
      sizeMB: 3.1,
      rows: 7500,
      duration: 11800,
      status: "PARTIAL_SUCCESS",
      offsetHours: 66,
      note: "5 abnormal PCD records.",
      errorDetails: "PCD out-of-range for 5 records.",
    },
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
      log: buildLog(tpl.status, operator, tpl.filename, importedAt, tpl.errorDetails),
    } satisfies ImportBatch;
  });
}

function buildLog(
  status: ImportBatchStatus,
  operator: string,
  filename: string,
  importedAt: string,
  errorDetails?: string,
) {
  const lines = [
    `[${importedAt}] ${operator} submitted import job: ${filename}`,
    `[${importedAt}] schema validation completed`,
    `[${importedAt}] ${STATUS_COPY[status]}`,
  ];
  if (errorDetails) {
    lines.push(`[${importedAt}] error details: ${errorDetails}`);
  }
  return lines.join("\n");
}
