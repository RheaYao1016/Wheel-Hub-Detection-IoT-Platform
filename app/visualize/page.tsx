"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Card from "../components/Layout/Card";
import PieChart from "../components/Charts/PieChart";
import LineChart from "../components/Charts/LineChart";
import ModelViewer from "../components/ThreeViewer/ModelViewer";
import BackButton from "../components/Layout/BackButton";
import staticRecords from "../../data.json" assert { type: "json" };

type ProjectRecord = {
  id: string;
  diameter: string;
  average_bolt: string;
  center: string;
  pcd: string;
  type: string;
};

type ProjectItem = {
  id: string;
  stage: string;
  result: "" | "PASS" | "FAIL";
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

const TICKER_STAGES = ["入站", "采集", "翻转", "判定", "联动"];
const RESULT_PATTERN: Array<ProjectItem["result"]> = ["", "", "", "PASS", "", "FAIL"];
const PROJECT_ROLL_INTERVAL = 2800;
const PROJECT_WINDOW = 6;
const DEFAULT_PROJECT_COUNT = 30;

const LOG_MESSAGES = [
  "相机完成曝光与取像",
  "边缘检测完成，直径=566.3mm",
  "孔距 PCD=114.28mm 在容差内",
  "判定 PASS，推送到看板",
  "判定 FAIL，派发返修任务",
  "上传统计报表到 /api/result",
  "工位 ST-02 队列已清空，等待下一批任务"
];
const LOG_APPEND_INTERVAL = 1200;
const INITIAL_LOG_COUNT = 3;
const MAX_LOG_LINES = 240;

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

const pad = (value: number) => value.toString().padStart(2, "0");

const formatLogTimestamp = (date: Date) =>
  `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds()
  )}.${date.getMilliseconds().toString().padStart(3, "0")}`;

const formatLogLine = (message: string, offsetMs = 0) => {
  const time = new Date(Date.now() - offsetMs);
  return `[${formatLogTimestamp(time)}] ${message}`;
};

const buildProjectPool = (records: ProjectRecord[]): ProjectItem[] => {
  const pool: ProjectItem[] = [];
  const base = records.slice(0, DEFAULT_PROJECT_COUNT);

  const ensureLength = Math.max(DEFAULT_PROJECT_COUNT, base.length || DEFAULT_PROJECT_COUNT);
  for (let i = 0; i < ensureLength; i += 1) {
    const record = base[i % (base.length || 1)];
    pool.push({
      id: record?.id ?? `WH-2025-${String(1000 + i).padStart(4, "0")}`,
      stage: TICKER_STAGES[i % TICKER_STAGES.length],
      result: RESULT_PATTERN[i % RESULT_PATTERN.length]
    });
  }
  return pool;
};

const records = staticRecords as ProjectRecord[];

export default function VisualizePage() {
  const [trend, setTrend] = useState(makeTrend());
  const [projects, setProjects] = useState<ProjectItem[]>(() => buildProjectPool(records));
  const [windowIndex, setWindowIndex] = useState(0);

  const initialLogs = useMemo(
    () =>
      Array.from({ length: INITIAL_LOG_COUNT }).map((_, idx) =>
        formatLogLine(LOG_MESSAGES[idx % LOG_MESSAGES.length], (INITIAL_LOG_COUNT - idx) * LOG_APPEND_INTERVAL)
      ),
    []
  );
  const [logs, setLogs] = useState<string[]>(initialLogs);
  const logBoxRef = useRef<HTMLDivElement>(null);
  const logCursorRef = useRef(initialLogs.length);

  useEffect(() => {
    setProjects(buildProjectPool(records));
    setWindowIndex(0);
  }, []);

  useEffect(() => {
    const labels = buildLabels();
    const timer = window.setInterval(() => {
      setTrend((prev) =>
        prev.slice(1).concat({
          name: labels[Math.floor(Math.random() * labels.length)],
          value: Math.round(200 + Math.random() * 160)
        })
      );
    }, 2500);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!projects.length) {
      return;
    }
    const timer = window.setInterval(() => {
      setWindowIndex((prev) => (prev + 1) % projects.length);
    }, PROJECT_ROLL_INTERVAL);
    return () => window.clearInterval(timer);
  }, [projects.length]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLogs((prev) => {
        const message = LOG_MESSAGES[logCursorRef.current % LOG_MESSAGES.length];
        logCursorRef.current += 1;
        const next = [...prev, formatLogLine(message)];
        return next.length > MAX_LOG_LINES ? next.slice(next.length - MAX_LOG_LINES) : next;
      });
    }, LOG_APPEND_INTERVAL);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (logBoxRef.current) {
      logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
    }
  }, [logs]);

  // 预留实时接口，接入后端后取消注释即可。
  /*
  useEffect(() => {
    const refreshLive = async () => {
      try {
        const response = await fetch("/api/live");
        if (!response.ok) return;
        const payload = await response.json();
        if (Array.isArray(payload.projects)) {
          setProjects(buildProjectPool(payload.projects));
          setWindowIndex(0);
        }
        if (Array.isArray(payload.logs)) {
          setLogs((prev) => {
            const appended = payload.logs.map((msg: string) => `[${formatLogTimestamp(new Date())}] ${msg}`);
            const combined = [...prev, ...appended];
            return combined.length > MAX_LOG_LINES ? combined.slice(combined.length - MAX_LOG_LINES) : combined;
          });
        }
        if (typeof payload.step === "number" && typeof window !== "undefined" && typeof (window as any).setCurrentStep === "function") {
          (window as any).setCurrentStep(payload.step);
        }
      } catch (error) {
        console.warn("live feed unavailable", error);
      }
    };
    const liveTimer = window.setInterval(refreshLive, 2500);
    return () => window.clearInterval(liveTimer);
  }, []);
  */

  const visibleProjects = useMemo(() => {
    if (!projects.length) {
      return [];
    }
    const length = Math.min(PROJECT_WINDOW, projects.length);
    return Array.from({ length }, (_, idx) => projects[(windowIndex + idx) % projects.length]);
  }, [projects, windowIndex]);

  return (
    <div className="page-shell pt-0 pb-10 space-y-6">
      <BackButton fallbackHref="/home" />
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-[var(--text-secondary)]">可视化平台 / 统计分析</span>
          <h1 className="text-2xl font-semibold text-white md:text-3xl">统计分析总览</h1>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">多维掌握轮毂检测实时指标、趋势曲线与 3D 模型，辅助快速调度。</p>
      </div>
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
        <Card className="col-span-1 md:col-span-12">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">关键指标</h2>
            <span className="text-xs text-[var(--text-secondary)]">实时同步 · 更新频率 5s</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            {METRICS.map((metric) => (
              <div key={metric.label} className="rounded-2xl border border-[rgba(91,189,247,0.18)] bg-[rgba(91,189,247,0.08)] px-4 py-3 shadow-[0_12px_22px_rgba(5,31,57,0.38)]">
                <span className="text-sm text-[var(--text-secondary)]">{metric.label}</span>
                <span className="block text-3xl font-bold text-white">{metric.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        <Card className="chart-card col-span-1 md:col-span-6">
          <div className="chart-header">
            <div>
              <h2>合格率占比</h2>
              <p>抽检批次 · 当日累计（数量为可视化口径）</p>
            </div>
          </div>
          <div className="chart-body">
            <PieChart title="合格率占比" data={DONUT_DATA} />
          </div>
        </Card>
        <Card className="chart-card col-span-1 md:col-span-6">
          <div className="chart-header">
            <div>
              <h2>检测量走势（近 30 天）</h2>
            </div>
            <button
              type="button"
              className="rounded-full border border-[rgba(91,189,247,0.3)] px-3 py-1 text-xs text-[rgba(232,243,255,0.78)] transition hover:border-[rgba(91,189,247,0.6)]"
              onClick={() => setTrend(makeTrend())}
            >
              刷新数据
            </button>
          </div>
          <div className="chart-body">
            <LineChart data={trend} />
          </div>
        </Card>
      </div>

      <Card className="live-card">
        <div className="live-column">
          <h3>实时项目</h3>
          <ul className="live-list">
            {visibleProjects.map((item) => (
              <li key={`${item.id}-${item.stage}`}>
                <span className="live-id">
                  <span className="font-mono">{item.id}</span>
                  <span className="live-stage">{item.stage}</span>
                </span>
                <span className="live-result">
                  {item.result ? (
                    <span className={`badge ${item.result === "PASS" ? "pass" : "fail"}`}>{item.result}</span>
                  ) : (
                    "—"
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="live-column">
          <h3>日志预览</h3>
          <div ref={logBoxRef} className="logbox">
            {logs.map((line, index) => (
              <div key={`${line}-${index}`}>{line}</div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
