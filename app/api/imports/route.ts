"use server";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { ImportBatch } from "@/types/imports";
import { addBatch, listBatches } from "./store";

const MAX_PAGE_SIZE = 20;
const MIN_PAGE_SIZE = 5;

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const status = params.get("status");
  const importer = params.get("importer");
  const search = params.get("q");
  const start = params.get("start");
  const end = params.get("end");
  const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10));
  const rawPageSize = Number.parseInt(params.get("pageSize") ?? "8", 10);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(MIN_PAGE_SIZE, Number.isNaN(rawPageSize) ? 8 : rawPageSize));

  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : null;
  if (endDate) {
    endDate.setHours(23, 59, 59, 999);
  }

  const allBatches = [...listBatches()].sort((a, b) => (a.importedAt > b.importedAt ? -1 : 1));
  const filtered = allBatches.filter((batch) => {
    if (status && batch.status !== status) return false;
    if (importer && batch.importedBy !== importer) return false;
    if (search && !batch.filename.toLowerCase().includes(search.toLowerCase())) return false;
    const importedTime = new Date(batch.importedAt).getTime();
    if (startDate && importedTime < startDate.getTime()) return false;
    if (endDate && importedTime > endDate.getTime()) return false;
    return true;
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const offset = (currentPage - 1) * pageSize;
  const items = filtered.slice(offset, offset + pageSize);

  const filters = {
    importers: Array.from(new Set(allBatches.map((batch) => batch.importedBy))).sort(),
    statuses: ["成功", "部分成功", "失败"]
  } as const;

  return NextResponse.json({ items, total, page: currentPage, pageSize, filters });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as ImportBatch;
  addBatch(payload);
  return NextResponse.json({ ok: true, item: payload });
}
