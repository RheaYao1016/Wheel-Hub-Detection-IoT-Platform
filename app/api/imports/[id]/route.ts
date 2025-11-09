"use server";

import { NextResponse } from "next/server";
import { deleteBatch, updateBatch } from "../store";

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  deleteBatch(params.id);
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const update = await request.json();
  updateBatch(params.id, update);
  return NextResponse.json({ ok: true });
}
