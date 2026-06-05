import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    data: [
      { id: "job-1", name: "缺陷分类模型 v3.7", status: "completed", progress: 100, createdAt: new Date(Date.now() - 86400000).toISOString(), completedAt: new Date().toISOString() },
      { id: "job-2", name: "尺寸偏差检测 v2.1", status: "running", progress: 67, createdAt: new Date(Date.now() - 3600000).toISOString() },
    ],
  });
}
