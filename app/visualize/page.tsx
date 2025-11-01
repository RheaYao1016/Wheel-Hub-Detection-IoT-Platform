"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

type TickerItem = {
  id: string;
  stage: string;
  flag: string;
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
const TICKER_FLAGS = ["—", "—", "—", "—", "PASS", "FAIL"];
const TICKER_SIZE = 20;

const LOG_MESSAGES = [
  "相机完成曝光与取像",
  "边缘检测完成，直径=566.3mm",
  "孔距 PCD=114.28mm 在容差内",
  "同轴度 0.12mm，跳动 0.11mm",
  "判定 PASS，推送到看板",
  "上传至 /api/result 成功"
];
const LOG_APPEND_INTERVAL = 1200;
const MAX_LOG_LINES = 200;
const INITIAL_LOG_COUNT = 3;

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

const formatTimestamp = (date: Date) =>
  `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${date.getMilliseconds().toString().padStart(3, "0")}`;

const formatLogLine = (message: string, offsetMs = 0) => {
  const time = new Date(Date.now() - offsetMs);
  return `[${formatTimestamp(time)}] ${message}`;
};

const buildTickerSeed = (records: ProjectRecord[]): TickerItem[] => {
  const fallback = Array.from({ length: TICKER_SIZE }).map((_, idx) => ({
    id: `WH-2025-${String(idx + 1).padStart(3, "0")}`,
    stage: TICKER_STAGES[idx % TICKER_STAGES.length],
    flag: TICKER_FLAGS[idx % TICKER_FLAGS.length]
  }));

  if (!records.length) {
    return fallback;
  }

  const base = records.slice(0, TICKER_SIZE);
  const items: TickerItem[] = base.map((record, idx) => ({
    id: record.id ?? fallback[idx].id,
    stage: TICKER_STAGES[idx % TICKER_STAGES.length],
    flag: TICKER_FLAGS[idx % TICKER_FLAGS.length]
  }));

  while (items.length < TICKER_SIZE) {
    const idx = items.length;
    const record = base[idx % base.length];
    items.push({
      id: record?.id ?? fallback[idx].id,
      stage: TICKER_STAGES[idx % TICKER_STAGES.length],
      flag: TICKER_FLAGS[idx % TICKER_FLAGS.length]
    });
  }

  return items;
};

const records = staticRecords as ProjectRecord[];

export default function VisualizePage() {
  const [trend, setTrend] = useState(makeTrend());
  const [tickerItems, setTickerItems] = useState<TickerItem[]>(() => buildTickerSeed(records));
  const tickerRef = useRef<HTMLDivElement>(null);
  const tickerListRef = useRef<HTMLUListElement>(null);

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
    if (!tickerItems.length) {
      return;
    }
    let offset = 0;
    let frameId = 0;

    const step = () => {
      const container = tickerRef.current;
      const list = tickerListRef.current;
      if (!container || !list || !list.firstElementChild) {
        frameId = window.requestAnimationFrame(step);
        return;
      }
      const rowHeight = (list.firstElementChild as HTMLElement).offsetHeight || 34;
      offset += 0.7;
      if (offset >= rowHeight) {
        offset = 0;
        container.scrollTop = 0;
        setTickerItems((prev) => {
          if (prev.length <= 1) return prev;
          const [first, ...rest] = prev;
          return [...rest, first];
        });
      } else {
        container.scrollTop = offset;
      }
      frameId = window.requestAnimationFrame(step);
    };

    frameId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frameId);
  }, [tickerItems.length]);

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
          setTickerItems(buildTickerSeed(payload.projects));
        }
        if (Array.isArray(payload.logs)) {
          setLogs((prev) => {
            const appended = payload.logs.map((msg: string) => `[${formatTimestamp(new Date())}] ${msg}`);
            const combined = [...prev, ...appended];
            return combined.length > MAX_LOG_LINES ? combined.slice(combined.length - MAX_LOG_LINES) : combined;
          });
        }
        if (typeof payload.step === "number" && typeof window !== "undefined" && typeof (window as any).setFlowStep === "function") {
          (window as any).setFlowStep(payload.step);
        }
      } catch (error) {
        console.warn("live feed unavailable", error);
      }
    };
    const liveTimer = window.setInterval(refreshLive, 2000);
    return () => window.clearInterval(liveTimer);
  }, []);
  */

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
              <div key={metric.label} className="rounded-2xl border border-[rgba(91,189,247,0.18)] bg-[rgba(91,189,247,0.08)] px-4 py-3 shadow-[0_12px_22px_rgba(5,31,57,0.38)]">
                <span className="text-sm text-[var(--text-secondary)]">{metric.label}</span>
                <span className="block text-3xl font-bold text-white">{metric.value}</span>
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
              className="rounded-full border border-[rgba(91,189,247,0.3)] px-3 py-1 text-xs text-[rgba(232,243,255,0.78)] transition hover:border-[rgba(91,189,247,0.6)]"
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
          <h2 className="mb-4 text-lg font-semibold text-white">实时项目</h2>
          <div
            ref={tickerRef}
            className="max-h-[220px] overflow-hidden rounded-xl border border-[rgba(91,189,247,0.14)] bg-[rgba(11,29,53,0.7)]"
          >
            <ul ref={tickerListRef} className="divide-y divide-[rgba(255,255,255,0.06)] text-sm text-[rgba(232,243,255,0.88)]">
              {tickerItems.map((item, index) => (
                <li key={`${item.id}-${index}`} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="font-mono text-white">{item.id}</span>
                  <span>{item.stage}</span>
                  <span className="ml-auto text-xs text-[var(--text-secondary)]">{item.flag}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
        <Card className="col-span-1 md:col-span-6">
          <h2 className="mb-4 text-lg font-semibold text-white">日志预览</h2>
          <div
            ref={logBoxRef}
            className="h-[260px] overflow-y-auto rounded-xl border border-[rgba(91,189,247,0.14)] bg-[rgba(255,255,255,0.04)] p-3 font-mono text-xs leading-[1.6] text-[rgba(232,243,255,0.88)]"
          >
            {logs.map((line, index) => (
              <div key={`${line}-${index}`}>{line}</div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
