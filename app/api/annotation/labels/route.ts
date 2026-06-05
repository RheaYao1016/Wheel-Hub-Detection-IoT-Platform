import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    data: [
      { id: "label-1", name: "划痕", color: "#ef4444" },
      { id: "label-2", name: "凹坑", color: "#f59e0b" },
      { id: "label-3", name: "锈蚀", color: "#8b5cf6" },
      { id: "label-4", name: "变形", color: "#3b82f6" },
    ],
  });
}
