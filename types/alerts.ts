export type AlertLevel = "HIGH" | "MEDIUM" | "LOW" | "高" | "中" | "低";

export type AlertStatus =
  | "PENDING"
  | "READ"
  | "DISPATCHED"
  | "IGNORED"
  | "待处理"
  | "已读"
  | "已派发"
  | "已忽略";

export type AlertRecord = {
  id: string;
  timestamp: string;
  station: string;
  level: AlertLevel;
  description: string;
  status: AlertStatus;
};
