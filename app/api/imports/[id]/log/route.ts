"use server";

import { NextResponse } from "next/server";
import { getBatchById } from "../../store";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const batch = getBatchById(params.id);
  if (!batch) {
    return new NextResponse("未找到日志", { status: 404 });
  }

  return new NextResponse(batch.log ?? "", {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${batch.id}.log"`
    }
  });
}
