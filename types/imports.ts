export type ImportBatchStatus =
  | "SUCCESS"
  | "FAILED"
  | "PARTIAL_SUCCESS"
  | "COMPLETED"
  | "PROCESSING"
  | "成功"
  | "失败"
  | "部分成功";

export type ImportStatus = ImportBatchStatus;

export type ImportBatch = {
  id: string;
  filename: string;
  size?: number;
  rows?: number;
  durationMs?: number;
  status: ImportBatchStatus;
  importedAt?: string;
  timestamp?: string;
  importedBy?: string;
  note?: string;
  errorDetails?: string;
  log?: string;
  taskId?: string;
  processedFiles?: number;
  failedFiles?: number;
  totalFiles?: number;
};

export type ImportRecord = ImportBatch;

export type ImportProgress = {
  taskId?: string;
  filename?: string;
  status: ImportStatus;
  currentRow?: number;
  totalRows?: number;
  processedFiles?: number;
  failedFiles?: number;
  totalFiles?: number;
  percentage: number;
  message?: string;
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
