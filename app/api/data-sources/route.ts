import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    data: [
      {
        id: "ds-001",
        name: "一号产线相机",
        type: "camera_stream",
        status: "active",
        description: "一号产线正面和侧面检测相机视频流",
        lastSync: new Date().toISOString(),
      },
      {
        id: "ds-002",
        name: "二号产线相机",
        type: "camera_stream",
        status: "active",
        description: "二号产线正面检测相机视频流",
        lastSync: new Date().toISOString(),
      },
      {
        id: "ds-004",
        name: "MES生产系统",
        type: "mes_database",
        status: "active",
        description: "制造执行系统生产数据，含班次、产量、缺陷记录",
        lastSync: new Date(Date.now() - 300000).toISOString(),
      },
      {
        id: "ds-006",
        name: "SCADA传感器",
        type: "scada_stream",
        status: "active",
        description: "设备传感器实时数据，含温度、振动、利用率",
        lastSync: new Date().toISOString(),
      },
      {
        id: "ds-008",
        name: "质量检测数据库",
        type: "quality_database",
        status: "active",
        description: "历史质量检测记录，含缺陷分类和统计",
        lastSync: new Date(Date.now() - 600000).toISOString(),
      },
      {
        id: "ds-010",
        name: "AI模型仓库",
        type: "model_registry",
        status: "standby",
        description: "训练完成的AI模型版本和性能指标",
        lastSync: new Date(Date.now() - 3600000).toISOString(),
      },
    ],
  });
}
