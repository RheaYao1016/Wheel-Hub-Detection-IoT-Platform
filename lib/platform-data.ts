import wheelSeed from "@/data.json";
import { prisma } from "@/lib/prisma";
import type {
  AdminSnapshot,
  AlertSnapshot,
  CameraSnapshot,
  CommandCenterSnapshot,
  DeviceSnapshot,
  DigitalTwinSnapshot,
  DistributionPoint,
  FlowStepSnapshot,
  LiveProjectSnapshot,
  MetricCard,
  MonitorSnapshot,
  SensorSnapshot,
  TrendPoint,
} from "@/types/platform";

type WheelSeedRecord = {
  id: string;
  diameter: string;
  average_bolt: string;
  center: string;
  pcd: string;
  type: string;
};

type WheelRecord = {
  id: string;
  diameter: number;
  averageBolt: number;
  center: number;
  pcd: number;
  type: string;
};

const SIZE_BANDS = [
  { label: "15 寸", min: 0, max: 560 },
  { label: "16 寸", min: 560, max: 590 },
  { label: "17 寸", min: 590, max: 620 },
  { label: "18 寸", min: 620, max: 660 },
  { label: "19 寸", min: 660, max: Number.POSITIVE_INFINITY },
] as const;

const MODEL_BANDS = [
  { label: "HUB-A", min: 0, max: 180 },
  { label: "HUB-B", min: 180, max: 220 },
  { label: "HUB-C", min: 220, max: 260 },
  { label: "HUB-D", min: 260, max: 320 },
  { label: "HUB-E", min: 320, max: Number.POSITIVE_INFINITY },
] as const;

const FLOW_STEPS: FlowStepSnapshot[] = [
  { title: "入站对中", meta: "夹具锁定与姿态校正", duration: "00:12" },
  { title: "多面采集", meta: "相机联动与测量建模", duration: "00:18" },
  { title: "翻转检测", meta: "轮辋与孔位二次扫描", duration: "00:15" },
  { title: "视觉判定", meta: "尺寸、缺陷与等级输出", duration: "00:10" },
  { title: "数据联动", meta: "仓储、MES 与告警同步", duration: "00:08" },
];

const CAMERA_LAYOUT: CameraSnapshot[] = [
  { id: "CAM-01", title: "上料工位", location: "L1 / 上料入口", status: "在线", description: "监测轮毂入站节拍与定位状态" },
  { id: "CAM-02", title: "主检测工位", location: "L1 / 检测岛", status: "在线", description: "联动尺寸测量与外观采集" },
  { id: "CAM-03", title: "翻转工位", location: "L1 / 翻转模块", status: "在线", description: "监测翻转姿态与孔位扫描" },
  { id: "CAM-04", title: "出站缓存", location: "L1 / 分拣出口", status: "待命", description: "记录分拣结果与缓存队列" },
];

function toSeedRecord(record: WheelSeedRecord, index: number): WheelRecord {
  const baseType = record.type === "合格" && index % 7 === 0 ? "不合格" : record.type;

  return {
    id: record.id,
    diameter: Number(record.diameter),
    averageBolt: Number(record.average_bolt),
    center: Number(record.center),
    pcd: Number(record.pcd),
    type: baseType,
  };
}

async function loadWheelRecords(): Promise<WheelRecord[]> {
  const seeded = (wheelSeed as WheelSeedRecord[]).map(toSeedRecord);

  if (!process.env.DATABASE_URL) {
    return seeded;
  }

  try {
    const wheels = await prisma.wheel.findMany({
      orderBy: { createdAt: "desc" },
      take: 240,
    });

    if (!wheels.length) {
      return seeded;
    }

    return wheels.map((item) => ({
      id: item.wheelNumber,
      diameter: item.diameter,
      averageBolt: item.averageBolt,
      center: item.center,
      pcd: item.pcd,
      type: item.type,
    }));
  } catch (error) {
    console.warn("Falling back to local wheel seed data.", error);
    return seeded;
  }
}

function formatTimestamp(offsetMinutes: number) {
  const date = new Date(Date.now() - offsetMinutes * 60_000);
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function buildTrend(base: number, variance: number, length = 30): TrendPoint[] {
  const now = new Date();

  return Array.from({ length }, (_, index) => {
    const current = new Date(now);
    current.setDate(now.getDate() - (length - 1 - index));
    const modifier = ((index * 17) % 11) - 5;

    return {
      name: `${current.getMonth() + 1}/${current.getDate()}`,
      value: base + modifier * variance + (index % 3) * Math.round(variance / 2),
    };
  });
}

function buildDistribution(
  records: WheelRecord[],
  bands: ReadonlyArray<{ label: string; min: number; max: number }>,
  selector: (record: WheelRecord) => number,
): DistributionPoint[] {
  return bands.map((band) => ({
    name: band.label,
    value: records.filter((record) => {
      const value = selector(record);
      return value >= band.min && value < band.max;
    }).length,
  }));
}

function buildQuality(records: WheelRecord[]): DistributionPoint[] {
  const qualified = records.filter((record) => record.type === "合格").length;
  const unqualified = Math.max(records.length - qualified, 0);

  return [
    { name: "合格", value: qualified || 1 },
    { name: "不合格", value: unqualified || 1 },
  ];
}

function buildMetrics(records: WheelRecord[]): MetricCard[] {
  const total = records.length;
  const qualified = records.filter((record) => record.type === "合格").length;
  const completionRate = total ? ((qualified / total) * 100).toFixed(1) : "0.0";
  const warningCount = Math.max(1, Math.floor(total / 8));

  return [
    { label: "在制轮毂总量", value: `${total}`, note: "含在制与待复检", delta: "+8.2%", trend: "up" },
    { label: "当班完成率", value: `${completionRate}%`, note: "按最近一班次估算", delta: "+2.4%", trend: "up" },
    { label: "平均节拍", value: "53.8s", note: "相比昨日更平稳", delta: "-4.6%", trend: "down" },
    { label: "预警工单", value: `${warningCount}`, note: "待派发与处理中", delta: "实时", trend: "stable" },
  ];
}

function buildDevices(records: WheelRecord[]): DeviceSnapshot[] {
  const total = records.length || 24;

  return [
    {
      name: "传送机构",
      status: "运行中",
      utilization: 88,
      temperature: 42,
      runtimeHours: 126,
      note: `最近 8 小时处理 ${Math.max(20, total * 3)} 件`,
    },
    {
      name: "中心夹具",
      status: "运行中",
      utilization: 91,
      temperature: 38,
      runtimeHours: 132,
      note: "夹紧力曲线稳定，重复定位正常",
    },
    {
      name: "侧面夹具",
      status: "维护中",
      utilization: 64,
      temperature: 45,
      runtimeHours: 118,
      note: "执行器进入例行保养窗口",
    },
    {
      name: "视觉检测站",
      status: "运行中",
      utilization: 95,
      temperature: 36,
      runtimeHours: 147,
      note: "算法容器已自动扩容到双实例",
    },
  ];
}

function buildAlerts(records: WheelRecord[]): AlertSnapshot[] {
  const abnormal = records.filter((record) => record.type !== "合格").length;

  return [
    {
      id: "ALT-2401",
      level: "高",
      title: "翻转工位姿态偏差超阈值",
      station: "ST-03",
      timestamp: formatTimestamp(12),
      detail: "连续 3 次姿态偏差超过 0.30°，建议检查伺服归零与治具磨损。",
      status: "待处理",
    },
    {
      id: "ALT-2402",
      level: "中",
      title: `异常轮毂复检任务已积压 ${abnormal}`,
      station: "QA-01",
      timestamp: formatTimestamp(26),
      detail: "建议优先分派班组长复核，避免影响出站节拍。",
      status: "处理中",
    },
    {
      id: "ALT-2403",
      level: "低",
      title: "边缘检测模型已完成热更新",
      station: "AI-GW",
      timestamp: formatTimestamp(40),
      detail: "v3.7 权重已下发，当前推理时延下降约 6%。",
      status: "已闭环",
    },
  ];
}

function buildLogs(records: WheelRecord[]): string[] {
  return records.slice(0, 8).map((record, index) => {
    const messages = [
      "相机完成曝光与取像，进入边缘检测链路",
      "轮毂中心孔定位完成，开始计算 PCD 偏差",
      record.type === "合格" ? "检测通过，推送 MES 与仓储分拣队列" : "检测异常，自动转入复检流程",
    ];

    return `[${formatTimestamp(index * 4)}] ${record.id} · ${messages[index % messages.length]}`;
  });
}

function buildLiveProjects(records: WheelRecord[]): LiveProjectSnapshot[] {
  const stages = ["入站", "采集", "翻转", "判定", "联动"];

  return records.slice(0, 6).map((record, index) => ({
    id: `WH-${record.id}`,
    stage: stages[index % stages.length],
    result: index % 5 === 3 ? "FAIL" : index % 2 === 0 ? "" : "PASS",
    model: MODEL_BANDS[index % MODEL_BANDS.length].label,
    eta: `${18 + index * 3}s`,
  }));
}

function buildSensors(records: WheelRecord[]): SensorSnapshot[] {
  const diameterAverage = records.reduce((sum, record) => sum + record.diameter, 0) / Math.max(records.length, 1);
  const pcdAverage = records.reduce((sum, record) => sum + record.pcd, 0) / Math.max(records.length, 1);

  return [
    { label: "轮辋直径", value: Number(diameterAverage.toFixed(1)), unit: "mm", target: "650 ± 1.0", deviation: "-0.4", status: "正常" },
    { label: "PCD", value: Number(pcdAverage.toFixed(2)), unit: "mm", target: "280 ± 0.5", deviation: "+0.12", status: "正常" },
    { label: "同轴度", value: 0.18, unit: "mm", target: "< 0.25", deviation: "-0.07", status: "正常" },
    { label: "圆跳动", value: 0.22, unit: "mm", target: "< 0.30", deviation: "+0.02", status: "关注" },
  ];
}

export async function getCommandCenterSnapshot(): Promise<CommandCenterSnapshot> {
  const records = await loadWheelRecords();

  return {
    headline: {
      title: "轮毂检测 IoT 指挥中心",
      subtitle: "Command Center / Inspection Intelligence",
      description: "面向检测执行、节拍分析、质量总览与工单流转的一体化运营入口，适合大屏展示与日常运营协同。",
    },
    metrics: buildMetrics(records),
    quality: buildQuality(records),
    trend: buildTrend(Math.max(records.length * 8, 180), 6),
    liveProjects: buildLiveProjects(records),
    logs: buildLogs(records),
    devices: buildDevices(records),
    alerts: buildAlerts(records),
  };
}

export async function getDigitalTwinSnapshot(): Promise<DigitalTwinSnapshot> {
  const records = await loadWheelRecords();

  return {
    summary: {
      title: "数字孪生作业单元",
      description: "围绕 3D 模型、工艺流程、传感器与设备状态展示检测装备的实时画像，便于设备、工艺与算法团队协同定位问题。",
      sceneLabel: "Twin Mesh / Operational Mapping",
    },
    sensors: buildSensors(records),
    sizeDistribution: buildDistribution(records, SIZE_BANDS, (record) => record.diameter),
    modelDistribution: buildDistribution(records, MODEL_BANDS, (record) => record.pcd),
    flowSteps: FLOW_STEPS,
    devices: buildDevices(records),
    alerts: buildAlerts(records),
  };
}

export async function getMonitorSnapshot(): Promise<MonitorSnapshot> {
  const records = await loadWheelRecords();

  return {
    headline: {
      title: "生产监控与异常追踪",
      description: "聚焦视频监控、设备巡检与告警响应，服务于班组长和运维人员的现场联动。",
    },
    cameras: CAMERA_LAYOUT,
    trend: buildTrend(Math.max(records.length * 5, 120), 4),
    sizeDistribution: buildDistribution(records, SIZE_BANDS, (record) => record.diameter),
    modelDistribution: buildDistribution(records, MODEL_BANDS, (record) => record.pcd),
    devices: buildDevices(records),
    alerts: buildAlerts(records),
  };
}

export async function getAdminSnapshot(): Promise<AdminSnapshot> {
  const records = await loadWheelRecords();
  const sizeDistribution = buildDistribution(records, SIZE_BANDS, (record) => record.diameter);
  const topSizes = [...sizeDistribution].sort((left, right) => right.value - left.value).slice(0, 5);

  return {
    overview: {
      title: "运营后台",
      description: "提供导入、告警、质量与资源调度的统一管理入口，更偏向管理动作和运维治理，而不是重复展示现场看板。",
    },
    metrics: buildMetrics(records),
    trend: buildTrend(Math.max(records.length * 7, 160), 5),
    quality: buildQuality(records),
    topSizes,
    devices: buildDevices(records),
    alerts: buildAlerts(records),
  };
}
