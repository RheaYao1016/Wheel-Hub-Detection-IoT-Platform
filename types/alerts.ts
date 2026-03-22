export type AlertLevel = "高" | "中" | "低";

export type AlertStatus = "待处理" | "已读" | "已派发" | "已忽略";

export type AlertRecord = {
  id: string;
  timestamp: string;
  station: string;
  level: AlertLevel;
  description: string;
  status: AlertStatus;
};
