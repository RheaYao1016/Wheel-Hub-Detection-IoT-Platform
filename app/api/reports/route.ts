import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    data: [
      {
        id: "report-001",
        filename: "质量趋势报告_2026W22.docx",
        format: "docx",
        summary: "第22周轮毂检测质量趋势报告，含缺陷分布、产线对比和改进建议",
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: "report-002",
        filename: "缺陷分类统计_20260605.xlsx",
        format: "xlsx",
        summary: "按缺陷类型统计的检测数据汇总，含日/周/月趋势",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: "report-003",
        filename: "设备健康评估_20260604.pdf",
        format: "pdf",
        summary: "产线设备运行状态评估报告，含预测性维护建议",
        createdAt: new Date(Date.now() - 172800000).toISOString(),
      },
    ],
  });
}
