import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    data: [
      { id: "v3.7", name: "缺陷分类模型", accuracy: 97.2, deployedAt: new Date(Date.now() - 172800000).toISOString(), status: "active" },
      { id: "v3.6", name: "缺陷分类模型", accuracy: 96.8, deployedAt: new Date(Date.now() - 604800000).toISOString(), status: "archived" },
    ],
  });
}
