"use server";

import { NextResponse } from "next/server";

export async function POST() {
  await new Promise((resolve) => setTimeout(resolve, 600));
  return NextResponse.json({ ok: true, message: "sync completed" });
}
