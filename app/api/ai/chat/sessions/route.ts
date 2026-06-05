import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();
  return NextResponse.json({
    data: [
      {
        id: "session-001",
        title: "缺陷分析会话 #1",
        persona: "engineer",
        promptPresetId: "preset-001",
        sourceIds: ["ds-001", "ds-004"],
        lastMessagePreview: "划痕类缺陷占比从12.3%上升至18.7%，建议检查精加工工位",
        createdAt: new Date(now.getTime() - 7200000).toISOString(),
        updatedAt: new Date(now.getTime() - 1800000).toISOString(),
      },
      {
        id: "session-002",
        title: "设备诊断会话 #2",
        persona: "operator",
        promptPresetId: "preset-003",
        sourceIds: ["ds-006"],
        lastMessagePreview: "侧面夹具执行器进入保养窗口，传送机构温度偏高",
        createdAt: new Date(now.getTime() - 14400000).toISOString(),
        updatedAt: new Date(now.getTime() - 3600000).toISOString(),
      },
      {
        id: "session-003",
        title: "质量趋势问答 #3",
        persona: "manager",
        promptPresetId: "preset-002",
        sourceIds: ["ds-001", "ds-008"],
        lastMessagePreview: "本周合格率96.8%，较上周提升0.4个百分点",
        createdAt: new Date(now.getTime() - 86400000).toISOString(),
        updatedAt: new Date(now.getTime() - 43200000).toISOString(),
      },
    ],
  });
}
