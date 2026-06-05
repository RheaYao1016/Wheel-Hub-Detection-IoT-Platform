import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    data: [
      { id: "preset-1", name: "缺陷分析", prompt: "分析当前轮毂检测数据，识别异常模式并给出改进建议。", category: "analysis" },
      { id: "preset-2", name: "质量报告", prompt: "根据最近的检测数据，生成质量趋势报告。", category: "report" },
      { id: "preset-3", name: "设备诊断", prompt: "检查设备运行状态，分析潜在故障风险。", category: "diagnosis" },
    ],
  });
}
