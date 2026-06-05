import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();
  return NextResponse.json({
    data: [
      {
        id: "analysis-001",
        prompt: "分析近期轮毂检测数据中的缺陷分布规律，识别高风险缺陷类型",
        template: "quality-variance",
        verbosity: "standard",
        providerId: "openai",
        persona: "engineer",
        locale: "zh-CN",
        promptPresetId: "preset-001",
        sourceIds: ["ds-001", "ds-004"],
        status: "completed",
        result: {
          headline: "划痕类缺陷占比异常升高，需关注精加工工位",
          summary: "近7天检测数据显示，划痕类缺陷占比从12.3%上升至18.7%，主要集中在精加工工位。凹陷类缺陷保持稳定在5.2%，孔洞缺陷下降至1.8%。建议优先排查精加工刀具磨损和冷却液供给问题。",
          riskLevel: "high",
          confidence: 0.92,
          inspectionDomain: "表面缺陷检测",
          findings: ["划痕缺陷7日趋势上升52%", "精加工工位缺陷率是其他工位的2.3倍", "夜间班次缺陷率比白班高15%"],
          recommendations: ["立即检查精加工工位刀具磨损状态", "增加冷却液流量监测", "加强夜班首件检验频次"],
          evidence: [
            { label: "数据源", detail: "一号产线相机A + MES系统" },
            { label: "样本量", detail: "12,846条检测记录" },
            { label: "时间范围", detail: "2026-05-29 至 2026-06-05" },
          ],
          chartSeries: [
            { name: "划痕", value: 187 },
            { name: "凹陷", value: 52 },
            { name: "孔洞", value: 18 },
            { name: "裂纹", value: 8 },
            { name: "锈蚀", value: 5 },
          ],
          tokenUsage: { promptTokens: 2340, completionTokens: 890, totalTokens: 3230 },
        },
        createdAt: new Date(now.getTime() - 3600000).toISOString(),
        updatedAt: now.toISOString(),
      },
      {
        id: "analysis-002",
        prompt: "评估当前产线设备运行状态，识别潜在故障风险",
        template: "equipment-troubleshooting",
        verbosity: "deep",
        providerId: "deepseek",
        persona: "engineer",
        locale: "zh-CN",
        promptPresetId: "preset-003",
        sourceIds: ["ds-006"],
        status: "completed",
        result: {
          headline: "侧面夹具执行器进入保养窗口，传送机构温度偏高",
          summary: "设备健康评估显示：侧面夹具执行器利用率降至64%，已进入例行保养窗口；传送机构温度42°C接近预警阈值45°C；视觉检测站运行正常，算法容器已自动扩容。建议在本班次结束后安排侧面夹具保养，同时监控传送机构温度趋势。",
          riskLevel: "medium",
          confidence: 0.88,
          inspectionDomain: "设备健康诊断",
          findings: ["侧面夹具利用率持续下降至64%", "传送机构温度42°C呈上升趋势", "视觉检测站运行稳定，利用率95%"],
          recommendations: ["安排侧面夹具执行器保养", "增加传送机构温度监测频率", "保持视觉检测站当前配置"],
          evidence: [
            { label: "数据源", detail: "SCADA传感器数据" },
            { label: "监测时长", detail: "最近8小时连续监测" },
          ],
          chartSeries: [
            { name: "传送机构", value: 88 },
            { name: "中心夹具", value: 91 },
            { name: "侧面夹具", value: 64 },
            { name: "视觉检测站", value: 95 },
          ],
          tokenUsage: { promptTokens: 1850, completionTokens: 720, totalTokens: 2570 },
        },
        createdAt: new Date(now.getTime() - 7200000).toISOString(),
        updatedAt: new Date(now.getTime() - 3600000).toISOString(),
      },
    ],
  });
}
