import ExcelJS from "exceljs";

type CsvCell = string | number | boolean | null | undefined;

export type CsvRow = CsvCell[];

type XlsxSheet = {
  name: string;
  header?: string[];
  rows: CsvRow[];
};

export function buildExportFilename(prefix: string, extension = "csv") {
  const now = new Date();
  const pad = (value: number) => value.toString().padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `${prefix}_${stamp}.${extension}`;
}

export function exportToCsv(options: {
  filename: string;
  header?: string[];
  rows: CsvRow[];
}) {
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
  downloadBlob(blob, ensureExtension(filename, "csv"));
}

export async function exportToXlsx(options: {
  filename: string;
  sheets: XlsxSheet[];
}) {
  if (typeof window === "undefined") return;
  const { filename, sheets } = options;
  if (!sheets.length) return;

  const workbook = new ExcelJS.Workbook();

  sheets.forEach((sheetConfig) => {
    const worksheet = workbook.addWorksheet(sheetConfig.name.slice(0, 31) || "Sheet1");
    const { header, rows } = sheetConfig;

    if (header?.length) {
      worksheet.addRow(header);
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1B4D73" },
      };
    }

    rows.forEach((row) => {
      worksheet.addRow(row.map((item) => (item == null ? "" : item)));
    });

    const totalColumns = Math.max(
      header?.length ?? 0,
      ...rows.map((row) => row.length),
      1,
    );

    for (let col = 1; col <= totalColumns; col += 1) {
      let maxLength = 10;
      worksheet.eachRow((row) => {
        const value = row.getCell(col).value;
        const textValue = value == null ? "" : String(value);
        if (textValue.length > maxLength) {
          maxLength = textValue.length;
        }
      });
      worksheet.getColumn(col).width = Math.min(42, Math.max(12, maxLength + 2));
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadBlob(blob, ensureExtension(filename, "xlsx"));
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  if (typeof window === "undefined") return;
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function formatCell(value: CsvCell) {
  const normalized = value === null || value === undefined ? "" : String(value);
  if (/["\n,]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function ensureExtension(filename: string, extension: string) {
  return filename.endsWith(`.${extension}`) ? filename : `${filename}.${extension}`;
}
