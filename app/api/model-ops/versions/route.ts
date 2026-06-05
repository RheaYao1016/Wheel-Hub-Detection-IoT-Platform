import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    data: [
      {
        id: "model-v3.7",
        name: "YOLOv10m 缺陷分类 v3.7",
        metricsSummary: "mAP50: 95.2% | 精确率: 94.1% | 召回率: 93.8% | 推理速度: 12ms/帧",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: "model-v3.6",
        name: "YOLOv10m 缺陷分类 v3.6",
        metricsSummary: "mAP50: 93.8% | 精确率: 92.7% | 召回率: 92.3% | 推理速度: 13ms/帧",
        createdAt: new Date(Date.now() - 604800000).toISOString(),
      },
      {
        id: "model-v2.1",
        name: "YOLOv8n 尺寸偏差检测 v2.1",
        metricsSummary: "mAP50: 76.0% | 精确率: 78.5% | 召回率: 74.2% | 推理速度: 8ms/帧",
        createdAt: new Date(Date.now() - 518400000).toISOString(),
      },
      {
        id: "model-v3.5",
        name: "YOLOv10s 快速检测 v3.5",
        metricsSummary: "mAP50: 91.3% | 精确率: 90.2% | 召回率: 89.7% | 推理速度: 9ms/帧",
        createdAt: new Date(Date.now() - 1209600000).toISOString(),
      },
    ],
  });
}
