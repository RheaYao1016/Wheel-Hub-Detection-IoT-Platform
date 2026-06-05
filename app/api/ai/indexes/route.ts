import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const indexes = [
    // 指挥中心相关
    { indexId: "quality-mix", label: "质量组合分布", route: "/visualize", operation: "查看", category: "质量", type: "chart", tags: ["饼图", "合格率", "缺陷分类"] },
    { indexId: "throughput-trend", label: "吞吐趋势", route: "/visualize", operation: "查看", category: "吞吐", type: "chart", tags: ["折线图", "日产量", "趋势"] },
    { indexId: "queue-status", label: "队列状态", route: "/visualize", operation: "查看", category: "队列", type: "status", tags: ["实时", "积压", "响应时间"] },
    { indexId: "execution-log", label: "执行日志", route: "/visualize", operation: "查看", category: "日志", type: "log", tags: ["操作记录", "审计", "追踪"] },
    { indexId: "defect-scratch-trend", label: "划痕缺陷趋势", route: "/visualize", operation: "分析", category: "缺陷", type: "trend", tags: ["划痕", "精加工", "趋势"] },

    // 监控中心相关
    { indexId: "camera-wall", label: "相机墙", route: "/monitor", operation: "查看", category: "监控", type: "grid", tags: ["相机", "实时", "预览"] },
    { indexId: "alert-queue", label: "警报队列", route: "/monitor", operation: "处理", category: "警报", type: "queue", tags: ["告警", "严重程度", "分类"] },
    { indexId: "line-1-camera-a", label: "一号产线相机A", route: "/monitor", operation: "查看", category: "设备", type: "camera", tags: ["一号产线", "正面检测"] },
    { indexId: "line-1-camera-b", label: "一号产线相机B", route: "/monitor", operation: "查看", category: "设备", type: "camera", tags: ["一号产线", "侧面检测"] },
    { indexId: "line-2-camera-a", label: "二号产线相机A", route: "/monitor", operation: "查看", category: "设备", type: "camera", tags: ["二号产线", "正面检测"] },

    // 数字孪生相关
    { indexId: "device-side-clamp", label: "侧面夹具执行器", route: "/digital-twin", operation: "诊断", category: "设备", type: "actuator", tags: ["夹具", "执行器", "保养"] },
    { indexId: "device-conveyor", label: "传送机构", route: "/digital-twin", operation: "监控", category: "设备", type: "conveyor", tags: ["传送", "温度", "预警"] },
    { indexId: "device-vision-station", label: "视觉检测站", route: "/digital-twin", operation: "查看", category: "设备", type: "station", tags: ["视觉", "AI", "检测"] },
    { indexId: "device-center-clamp", label: "中心夹具", route: "/digital-twin", operation: "诊断", category: "设备", type: "actuator", tags: ["夹具", "中心", "定位"] },
    { indexId: "sensor-temp-conv", label: "传送机构温度传感器", route: "/digital-twin", operation: "读取", category: "传感器", type: "temperature", tags: ["温度", "传送", "预警"] },
    { indexId: "sensor-vibration", label: "振动传感器", route: "/digital-twin", operation: "读取", category: "传感器", type: "vibration", tags: ["振动", "异常检测"] },

    // 工作区相关
    { indexId: "ai-assistant", label: "AI助手", route: "/ai-assistant", operation: "对话", category: "AI", type: "chat", tags: ["对话", "分析", "问答"] },
    { indexId: "data-hub", label: "数据中心", route: "/data-hub", operation: "浏览", category: "数据", type: "hub", tags: ["数据源", "浏览", "管理"] },
    { indexId: "report-center", label: "报告中心", route: "/reports", operation: "生成", category: "报告", type: "report", tags: ["报告", "导出", "统计"] },
    { indexId: "training-center", label: "训练中心", route: "/training", operation: "管理", category: "训练", type: "job", tags: ["模型", "训练", "版本"] },
    { indexId: "annotation-studio", label: "标注工作室", route: "/annotation", operation: "标注", category: "标注", type: "tool", tags: ["标注", "数据", "质量"] },

    // 管理后台相关
    { indexId: "quality-dashboard", label: "质量看板", route: "/admin", operation: "查看", category: "管理", type: "dashboard", tags: ["质量", "统计", "趋势"] },
    { indexId: "mes-shift-report", label: "班次报告", route: "/admin", operation: "查看", category: "管理", type: "report", tags: ["班次", "MES", "报告"] },
    { indexId: "model-performance", label: "模型性能监控", route: "/admin", operation: "查看", category: "管理", type: "monitor", tags: ["模型", "性能", "推理速度"] },

    // 数据源相关
    { indexId: "ds-camera-feed", label: "相机视频流", route: "/data-hub", operation: "查看", category: "数据源", type: "stream", tags: ["相机", "视频", "实时"] },
    { indexId: "ds-mes-system", label: "MES系统数据", route: "/data-hub", operation: "查看", category: "数据源", type: "database", tags: ["MES", "生产", "统计"] },
    { indexId: "ds-scada-sensors", label: "SCADA传感器数据", route: "/data-hub", operation: "查看", category: "数据源", type: "stream", tags: ["SCADA", "传感器", "实时"] },
  ];

  return NextResponse.json({ data: indexes });
}
