export type TrendPoint = {
  name: string;
  value: number;
};

export type DistributionPoint = {
  name: string;
  value: number;
};

export type MetricCard = {
  label: string;
  value: string;
  note: string;
  delta: string;
  trend: "up" | "down" | "stable";
};

export type DeviceSnapshot = {
  name: string;
  status: "运行中" | "待机" | "维护中" | "告警";
  utilization: number;
  temperature: number;
  runtimeHours: number;
  note: string;
};

export type AlertSnapshot = {
  id: string;
  level: "高" | "中" | "低";
  title: string;
  station: string;
  timestamp: string;
  detail: string;
  status: "待处理" | "处理中" | "已闭环";
};

export type LiveProjectSnapshot = {
  id: string;
  stage: string;
  result: "" | "PASS" | "FAIL";
  model: string;
  eta: string;
};

export type FlowStepSnapshot = {
  title: string;
  meta: string;
  duration: string;
};

export type SensorSnapshot = {
  label: string;
  value: number;
  unit: string;
  target: string;
  deviation: string;
  status: "正常" | "关注" | "预警";
};

export type CameraSnapshot = {
  id: string;
  title: string;
  location: string;
  status: "在线" | "待命";
  description: string;
};

export type CommandCenterSnapshot = {
  headline: {
    title: string;
    subtitle: string;
    description: string;
  };
  metrics: MetricCard[];
  quality: DistributionPoint[];
  trend: TrendPoint[];
  liveProjects: LiveProjectSnapshot[];
  logs: string[];
  devices: DeviceSnapshot[];
  alerts: AlertSnapshot[];
};

export type DigitalTwinSnapshot = {
  summary: {
    title: string;
    description: string;
    sceneLabel: string;
  };
  sensors: SensorSnapshot[];
  sizeDistribution: DistributionPoint[];
  modelDistribution: DistributionPoint[];
  flowSteps: FlowStepSnapshot[];
  devices: DeviceSnapshot[];
  alerts: AlertSnapshot[];
};

export type MonitorSnapshot = {
  headline: {
    title: string;
    description: string;
  };
  cameras: CameraSnapshot[];
  trend: TrendPoint[];
  sizeDistribution: DistributionPoint[];
  modelDistribution: DistributionPoint[];
  devices: DeviceSnapshot[];
  alerts: AlertSnapshot[];
};

export type AdminSnapshot = {
  overview: {
    title: string;
    description: string;
  };
  metrics: MetricCard[];
  trend: TrendPoint[];
  quality: DistributionPoint[];
  topSizes: DistributionPoint[];
  devices: DeviceSnapshot[];
  alerts: AlertSnapshot[];
};
