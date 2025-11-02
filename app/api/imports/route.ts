"use server";

import { NextResponse } from "next/server";
import type { ImportBatch } from "@/types/imports";

type Store = ImportBatch[];

function getStore(): Store {
  const globalWithStore = globalThis as unknown as { __IMPORT_STORE__?: Store };
  if (!globalWithStore.__IMPORT_STORE__) {
    globalWithStore.__IMPORT_STORE__ = [];
  }
  return globalWithStore.__IMPORT_STORE__;
}

export async function GET() {
  return NextResponse.json(getStore());
}

export async function POST(request: Request) {
  const payload = (await request.json()) as ImportBatch;
  const store = getStore();
  store.unshift(payload);
  return NextResponse.json({ ok: true });
}
