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

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const store = getStore();
  const index = store.findIndex((item) => item.id === params.id);
  if (index >= 0) {
    store.splice(index, 1);
  }
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const update = await request.json();
  const store = getStore();
  const index = store.findIndex((item) => item.id === params.id);
  if (index >= 0) {
    store[index] = { ...store[index], ...update };
  }
  return NextResponse.json({ ok: true });
}
