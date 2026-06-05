import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    data: [
      {
        id: "proj-001",
        name: "轮毂表面缺陷标注集 v3",
        description: "包含划痕、凹陷、孔洞缺陷的标注数据集，用于YOLOv10模型训练",
        categories: ["scratch", "dent", "hole_defect"],
        createdAt: "2025-10-15T10:00:00Z",
        updatedAt: new Date().toISOString(),
      },
      {
        id: "proj-002",
        name: "裂纹与锈蚀专项标注",
        description: "针对裂纹和锈蚀两类难例缺陷的专项标注项目",
        categories: ["crack", "rust", "scratch"],
        createdAt: "2025-12-01T14:00:00Z",
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: "proj-003",
        name: "红外热成像异常标注",
        description: "红外相机捕获的轮毂热分布异常标注，用于热缺陷检测模型",
        categories: ["overheat", "cold_spot", "normal"],
        createdAt: "2026-02-20T09:00:00Z",
        updatedAt: new Date(Date.now() - 172800000).toISOString(),
      },
    ],
  });
}
