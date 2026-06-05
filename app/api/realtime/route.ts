import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Real-time simulation endpoint for live dashboard data.
 * Returns slightly randomized metrics each call to simulate a live factory floor.
 */
export async function GET() {
  const now = new Date();
  const base = {
    throughput: 847 + Math.floor(Math.random() * 40 - 20),
    qualified: 819 + Math.floor(Math.random() * 30 - 15),
    defectRate: +(2.8 + Math.random() * 1.2).toFixed(1),
    avgCycleTime: +(52.3 + Math.random() * 4 - 2).toFixed(1),
    queueDepth: Math.floor(Math.random() * 5),
    activeCameras: 4,
    totalCameras: 4,
    activeAlerts: Math.floor(Math.random() * 3),
    sensorHealth: +(97.2 + Math.random() * 2).toFixed(1),
    aiModelLatency: +(10.5 + Math.random() * 4).toFixed(1),
    timestamp: now.toISOString(),
  };

  const shiftInfo = (() => {
    const hour = now.getHours();
    if (hour >= 8 && hour < 16) return { shift: "白班", progress: +((hour - 8) / 8 * 100).toFixed(0) };
    if (hour >= 16 && hour < 24) return { shift: "中班", progress: +((hour - 16) / 8 * 100).toFixed(0) };
    return { shift: "夜班", progress: +((hour + 8) / 8 * 100).toFixed(0) };
  })();

  return NextResponse.json({
    data: {
      ...base,
      qualifiedRate: +((base.qualified / base.throughput) * 100).toFixed(1),
      shift: shiftInfo,
      devices: [
        { name: "传送机构", utilization: +(88 + Math.random() * 8).toFixed(0), temp: +(38 + Math.random() * 6).toFixed(1), status: "运行中" },
        { name: "中心夹具", utilization: +(91 + Math.random() * 6).toFixed(0), temp: +(35 + Math.random() * 4).toFixed(1), status: "运行中" },
        { name: "侧面夹具", utilization: +(62 + Math.random() * 10).toFixed(0), temp: +(40 + Math.random() * 5).toFixed(1), status: "需关注" },
        { name: "视觉检测站", utilization: +(94 + Math.random() * 5).toFixed(0), temp: +(32 + Math.random() * 3).toFixed(1), status: "运行中" },
      ],
      recentDefects: [
        { time: new Date(now.getTime() - 120000).toISOString(), type: "划痕", station: "精加工工位", severity: "中" },
        { time: new Date(now.getTime() - 300000).toISOString(), type: "凹陷", station: "粗加工工位", severity: "低" },
        { time: new Date(now.getTime() - 540000).toISOString(), type: "划痕", station: "精加工工位", severity: "高" },
      ],
    },
  });
}
