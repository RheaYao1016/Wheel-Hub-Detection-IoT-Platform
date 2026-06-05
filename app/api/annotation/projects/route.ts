import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    data: [
      { id: "proj-1", name: "轮毂表面缺陷标注", status: "active", assetCount: 128, labeledCount: 96, createdAt: new Date(Date.now() - 86400000).toISOString() },
    ],
  });
}
