import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    data: [
      { id: "ds-1", name: "产线相机 A", type: "camera", status: "在线", recordCount: 12480, lastSync: new Date().toISOString() },
      { id: "ds-2", name: "产线相机 B", type: "camera", status: "在线", recordCount: 9832, lastSync: new Date().toISOString() },
      { id: "ds-3", name: "MES 数据源", type: "mes", status: "在线", recordCount: 45620, lastSync: new Date().toISOString() },
      { id: "ds-4", name: "仓储系统", type: "wms", status: "待命", recordCount: 23100, lastSync: new Date().toISOString() },
    ],
  });
}
