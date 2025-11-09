type CsvCell = string | number | boolean | null | undefined;

export type CsvRow = CsvCell[];

export function buildExportFilename(prefix: string) {
  const now = new Date();
  const pad = (value: number) => value.toString().padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(
    now.getSeconds()
  )}`;
  return `${prefix}_${stamp}.csv`;
}

export function exportToCsv(options: { filename: string; header?: string[]; rows: CsvRow[] }) {
  if (typeof window === "undefined") return;
  const { filename, header, rows } = options;
  if ((!header || header.length === 0) && rows.length === 0) {
    return;
  }

  const lines: string[] = [];
  if (header?.length) {
    lines.push(header.map(formatCell).join(","));
  }
  rows.forEach((row) => {
    lines.push(row.map(formatCell).join(","));
  });

  const content = "\ufeff" + lines.join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function formatCell(value: CsvCell) {
  const normalized = value === null || value === undefined ? "" : String(value);
  if (/["\n,]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}
