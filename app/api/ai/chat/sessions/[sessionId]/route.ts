import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const now = new Date();

  // Return mock messages for any session
  const messages = [
    {
      id: `msg-${sessionId}-001`,
      role: "user",
      content: "帮我分析最近的轮毂检测数据，看看有没有异常趋势。",
      protocol: null,
      actions: [],
      createdAt: new Date(now.getTime() - 3600000).toISOString(),
    },
    {
      id: `msg-${sessionId}-002`,
      role: "assistant",
      content: `<p>根据最近7天的检测数据分析：</p>
<ul>
<li><strong>划痕类缺陷</strong>占比从12.3%上升至18.7%，主要集中在精加工工位</li>
<li><strong>凹陷类缺陷</strong>保持稳定在5.2%</li>
<li><strong>孔洞缺陷</strong>下降至1.8%</li>
</ul>
<p>建议优先排查精加工刀具磨损和冷却液供给问题。夜间班次缺陷率比白班高15%，建议加强夜班首件检验频次。</p>`,
      protocol: {
        indexIds: ["defect-scratch-trend", "line-1-camera-a", "mes-shift-report"],
        dataSourceIds: ["ds-001", "ds-004"],
      },
      actions: [
        {
          id: "act-goto-visualize",
          label: "查看缺陷趋势图",
          target: "/visualize",
          payload: { ai_index: "defect-scratch-trend" },
        },
        {
          id: "act-goto-monitor",
          label: "检查相机状态",
          target: "/monitor",
          payload: { ai_index: "line-1-camera-a" },
        },
      ],
      createdAt: new Date(now.getTime() - 3500000).toISOString(),
    },
    {
      id: `msg-${sessionId}-003`,
      role: "user",
      content: "精加工工位具体哪些设备需要关注？",
      protocol: null,
      actions: [],
      createdAt: new Date(now.getTime() - 3000000).toISOString(),
    },
    {
      id: `msg-${sessionId}-004`,
      role: "assistant",
      content: `<p>精加工工位设备状态分析：</p>
<ul>
<li><strong>侧面夹具执行器</strong> — 利用率降至64%，已进入例行保养窗口，建议本班次结束后安排保养</li>
<li><strong>传送机构</strong> — 温度42°C，接近预警阈值45°C，呈上升趋势</li>
<li><strong>视觉检测站</strong> — 运行正常，算法容器已自动扩容，利用率95%</li>
</ul>
<p>最紧急的是侧面夹具执行器，建议立即检查刀具磨损状态。</p>`,
      protocol: {
        indexIds: ["device-side-clamp", "device-conveyor", "device-vision-station"],
        dataSourceIds: ["ds-006"],
      },
      actions: [
        {
          id: "act-goto-twin",
          label: "查看数字孪生",
          target: "/digital-twin",
          payload: { ai_index: "device-side-clamp" },
        },
        {
          id: "act-goto-ops",
          label: "进入运行中台",
          target: "/operations",
          payload: { ai_index: "device-conveyor" },
        },
      ],
      createdAt: new Date(now.getTime() - 2900000).toISOString(),
    },
  ];

  return NextResponse.json({ data: messages });
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const now = new Date();

  // Return a mock AI response for new messages
  const messages = [
    {
      id: `msg-${sessionId}-user-${Date.now()}`,
      role: "user",
      content: "收到您的问题，正在分析中...",
      protocol: null,
      actions: [],
      createdAt: now.toISOString(),
    },
    {
      id: `msg-${sessionId}-ai-${Date.now()}`,
      role: "assistant",
      content: `<p>根据当前系统数据分析，以下是关键发现：</p>
<ul>
<li>当前产线合格率 <strong>96.8%</strong>，较上周提升0.4个百分点</li>
<li>检测队列无积压，平均响应时间 <strong>2.3秒</strong></li>
<li>AI模型推理速度稳定在 <strong>12ms/帧</strong></li>
</ul>
<p>系统整体运行良好。如需进一步分析特定指标，请继续提问。</p>`,
      protocol: {
        indexIds: ["quality-dashboard", "queue-status", "model-performance"],
        dataSourceIds: ["ds-001"],
      },
      actions: [
        {
          id: "act-goto-dashboard",
          label: "查看质量看板",
          target: "/visualize",
          payload: { ai_index: "quality-dashboard" },
        },
      ],
      createdAt: new Date(now.getTime() + 1000).toISOString(),
    },
  ];

  return NextResponse.json({ data: messages });
}
