export type ImportBatchStatus = "成功" | "失败" | "部分成功";

export type ImportBatch = {
  id: string;
  filename: string;
  size: number;
  rows: number;
  durationMs: number;
  status: ImportBatchStatus;
  importedAt: string;
  importedBy: string;
  note?: string;
  errorDetails?: string;
  log: string;
};

export type ImportHistoryResponse = {
  items: ImportBatch[];
  total: number;
  page: number;
  pageSize: number;
  filters: {
    importers: string[];
    statuses: ImportBatchStatus[];
  };
};
