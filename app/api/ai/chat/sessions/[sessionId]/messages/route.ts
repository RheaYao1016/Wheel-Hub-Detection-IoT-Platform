import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const now = new Date();

  // Mock: return AI response for the sent message
  const messages = [
    {
      id: `msg-${sessionId}-user-${Date.now()}`,
      role: "user",
      content: "用户消息已收到",
      protocol: null,
      actions: [],
      createdAt: now.toISOString(),
    },
    {
      id: `msg-${sessionId}-ai-${Date.now()}`,
      role: "assistant",
      content: `<p>根据当前系统数据，以下是分析结果：</p>
<ul>
<li>产线合格率 <strong>96.8%</strong>，运行稳定</li>
<li>检测队列无积压，平均响应 <strong>2.3秒</strong></li>
<li>AI模型推理速度 <strong>12ms/帧</strong></li>
</ul>
<p>系统整体运行良好。如需深入分析，请继续提问。</p>`,
      protocol: {
        indexIds: ["quality-dashboard", "queue-status"],
        dataSourceIds: ["ds-001"],
      },
      actions: [
        {
          id: "act-goto-visualize",
          label: "查看指挥中心",
          target: "/visualize",
          payload: { ai_index: "quality-dashboard" },
        },
      ],
      createdAt: new Date(now.getTime() + 1000).toISOString(),
    },
  ];

  return NextResponse.json({ data: messages });
}
