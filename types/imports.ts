export type ImportBatch = {
  id: string;
  filename: string;
  size: number;
  rows: number;
  status: "成功" | "失败" | "部分成功";
  createdAt: string;
  importedBy: string;
  note?: string;
};
