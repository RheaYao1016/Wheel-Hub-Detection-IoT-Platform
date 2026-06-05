import { NextResponse } from "next/server";
import { getAdminSnapshot } from "@/lib/platform-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await getAdminSnapshot();
  return NextResponse.json({
    data: {
      systemName: "工业表面缺陷智能检测系统",
      version: "2.4.0",
      status: "operational",
      totalInspections: snapshot.metrics[0]?.value ?? "0",
      qualityRate: snapshot.metrics[1]?.value ?? "0%",
      activeAlerts: snapshot.metrics[3]?.value ?? "0",
      lastUpdated: new Date().toISOString(),
    },
  });
}
