"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "../components/Layout/Card";
import PieChart from "../components/Charts/PieChart";
import LineChart from "../components/Charts/LineChart";
import ModelViewer from "../components/ThreeViewer/ModelViewer";
import staticRecords from "../../data.json" assert { type: "json" };

type ProjectRecord = {
  id: string;
  diameter: string;
  average_bolt: string;
  center: string;
  pcd: string;
  type: string;
};

type LogEntry = {
  id: string;
  status: "放行" | "复检";
  message: string;
  diameter: string;
  center: string;
  pcd: string;
  timestamp: string;
};

const METRICS = [
  { label: "轮毂总数", value: 3100 },
  { label: "已检测", value: 3000 },
  { label: "未检测", value: 100 },
  { label: "完成率(%)", value: 97 }
];

const DONUT_DATA = [
  { name: "15寸", value: 23 },
  { name: "16寸", value: 17 },
  { name: "17寸", value: 20 },
  { name: "18寸", value: 28 },
  { name: "19寸", value: 12 }
];

const buildLabels = () => {
  const labels: string[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
  }
  return labels;
};

const makeTrend = () => buildLabels().map((label) => ({ name: label, value: Math.round(200 + Math.random() * 160) }));

const deriveLogs = (records: ProjectRecord[]): LogEntry[] => {
  const now = new Date();
  return records.slice(0, 12).map((item, index) => {
    const time = new Date(now.getTime() - index * 14 * 60 * 1000);
    const stamp = `${time.getHours().toString().padStart(2, "0")}:${time
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
    const status = index % 4 === 0 ? "复检" : "放行";
    return {
      id: item.id,
      status,
      message: status === "放行" ? "检验通过，已同步到仓储系统。" : "尺寸偏差临界，安排人工复检确认。",
      diameter: item.diameter,
      center: item.center,
      pcd: item.pcd,
      timestamp: stamp,
    };
  });
};

export default function VisualizePage() {
  const records = staticRecords as ProjectRecord[];
  const [trend, setTrend] = useState(makeTrend());

  useEffect(() => {
    const labels = buildLabels();
    const timer = setInterval(() => {
      setTrend((prev) =>
        prev.slice(1).concat({
          name: labels[Math.floor(Math.random() * labels.length)],
          value: Math.round(200 + Math.random() * 160),
        })
      );
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  const displayProjects = useMemo(() => records.slice(0, 10), [records]);
  const logs = useMemo(() => deriveLogs(records), [records]);

  return (
    <div className="page-shell pt-0 pb-10">
      <Card className="p-5 md:p-6">
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-white md:text-2xl">三维模型展示</h1>
            <span className="text-xs text-[var(--text-secondary)] md:text-sm">交互旋转 / 缩放 / 平移</span>
          </div>
          <div className="h-[340px] rounded-2xl border border-[rgba(91,189,247,0.14)] bg-[#0a1b31]/80 p-3 md:h-[380px]">
            <ModelViewer />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        <Card className="col-span-1 md:col-span-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {METRICS.map((metric) => (
              <div key={metric.label} className="metric-tile">
                <span className="text-sm text-[var(--text-secondary)]">{metric.label}</span>
                <span className="text-3xl font-bold text-white">{metric.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <h2 className="mb-3 text-lg font-semibold text-white">合格率占比</h2>
            <PieChart title="合格率占比" data={DONUT_DATA} />
          </div>
        </Card>
        <Card className="col-span-1 md:col-span-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">检测量走势（近 30 天）</h2>
            <button
              type="button"
              className="rounded-full border border-[rgba(91,189,247,0.3)] px-3 py-1 text-xs text-[rgba(232,243,255,0.78)] hover:border-[rgba(91,189,247,0.6)]"
              onClick={() => setTrend(makeTrend())}
            >
              刷新数据
            </button>
          </div>
          <div className="h-[320px]">
            <LineChart data={trend} />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        <Card className="col-span-1 md:col-span-6">
          <h2 className="mb-4 text-lg font-semibold text-white">实时项目列表</h2>
          <div className="flex max-h-[360px] flex-col gap-3 overflow-y-auto pr-1">
            {displayProjects.length ? (
              displayProjects.map((item, index) => {
                const status = index % 5 === 0 ? "复检" : "合格";
                const badge = status === "合格" ? "bg-[#51d3c3]" : "bg-[#ffd166]";
                return (
                  <div key={item.id} className="flex items-center gap-3 rounded-xl border border-[rgba(91,189,247,0.14)] bg-[rgba(91,189,247,0.06)] px-4 py-3 text-sm text-[rgba(232,243,255,0.9)]">
                    <span className={`h-2 w-2 rounded-full ${badge}`}></span>
                    <span className="font-mono text-white">{item.id}</span>
                    <span className="text-xs text-[var(--text-secondary)]">直径 {item.diameter} mm</span>
                    <span className="text-xs text-[var(--text-secondary)]">中心孔 Φ{item.center}</span>
                    <span className="ml-auto text-sm font-semibold text-white">{status}</span>
                  </div>
                );
              })
            ) : (
              <div className="rounded-xl border border-dashed border-[rgba(91,189,247,0.3)] bg-[#0a1b31]/70 py-12 text-center text-sm text-[var(--text-secondary)]">
                暂无实时项目数据
              </div>
            )}
          </div>
        </Card>
        <Card className="col-span-1 md:col-span-6">
          <h2 className="mb-4 text-lg font-semibold text-white">检测日志预览</h2>
          <div className="flex max-h-[360px] flex-col gap-3 overflow-y-auto pr-1">
            {logs.map((log) => (
              <div key={log.id} className="rounded-xl border-l-4 border-[rgba(91,189,247,0.35)] bg-[#0a1b31]/75 px-4 py-3 text-sm text-[rgba(232,243,255,0.9)]">
                <div className="mb-1 flex items-center gap-3">
                  <span className="font-mono text-white">{log.id}</span>
                  <span className="text-xs text-[var(--text-secondary)]">{log.timestamp}</span>
                  <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${log.status === "放行" ? "bg-[rgba(81,211,195,0.25)] text-[#51d3c3]" : "bg-[rgba(255,209,102,0.25)] text-[#ffd166]"}`}>
                    {log.status}
                  </span>
                </div>
                <p className="text-sm text-[rgba(232,243,255,0.82)]">{log.message}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-[var(--text-secondary)]">
                  <span>直径 {log.diameter} mm</span>
                  <span>中心孔 Φ{log.center}</span>
                  <span>PCD {log.pcd} mm</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
