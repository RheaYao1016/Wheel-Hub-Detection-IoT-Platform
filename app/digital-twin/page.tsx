"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Card from "../components/Layout/Card";
import ModelViewer from "../components/ThreeViewer/ModelViewer";

type FlowStep = {
  title: string;
  description: string;
  pillTitle: string;
  pillMeta: string;
};

const FLOW_STEPS: FlowStep[] = [
  {
    title: "入站与对中",
    description: "工件定位至检测位，夹具锁定完成基准对中。",
    pillTitle: "入站对中",
    pillMeta: "夹具锁定"
  },
  {
    title: "多面采集",
    description: "同步测量关键尺寸、孔位与轮缘特征，覆盖主尺寸。",
    pillTitle: "多面采集",
    pillMeta: "同步测量"
  },
  {
    title: "翻转检测",
    description: "翻转暴露不同检测面，补充侧壁与孔群特征。",
    pillTitle: "翻转检测",
    pillMeta: "轮廓/孔位"
  },
  {
    title: "视觉判定",
    description: "视觉算法融合模型，输出尺寸、公差与良率判定。",
    pillTitle: "视觉判定",
    pillMeta: "算法输出"
  },
  {
    title: "数据联动",
    description: "检测结果联动仓储、ERP 与看板，形成闭环处理。",
    pillTitle: "数据联动",
    pillMeta: "ERP/仓储"
  }
];

export default function DigitalTwinPage() {
  return (
    <div className="page-shell pt-0 pb-10">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        <Card className="col-span-1 flex items-center justify-center md:col-span-3">
          <img src="/images/TianXiaWuShuang.png" alt="设备左侧结构示意" className="h-full w-full max-h-[360px] rounded-2xl object-contain" />
        </Card>
        <Card className="col-span-1 md:col-span-6">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-xl font-semibold text-white md:text-2xl">三维模型展示</h1>
            <span className="text-xs text-[var(--text-secondary)] md:text-sm">支持旋转 / 缩放 / 平移</span>
          </div>
          <div className="h-[420px] rounded-2xl border border-[rgba(91,189,247,0.14)] bg-[#0a1b31]/85 p-3">
            <ModelViewer />
          </div>
        </Card>
        <Card className="col-span-1 flex items-center justify-center md:col-span-3">
          <img src="/images/she_bei_jian_mo.png" alt="设备右侧结构示意" className="h-full w-full max-h-[360px] rounded-2xl object-contain" />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="flex min-h-[180px] flex-col items-center justify-center text-center">
          <h2 className="mb-3 text-lg font-semibold text-white">实时参数</h2>
          <p className="max-w-xs text-sm leading-7 text-[rgba(232,243,255,0.85)]">
            传感器读数与尺寸偏差实时映射，支持自定义阈值与数据订阅，辅助维护人员迅速掌握状态。
          </p>
        </Card>
        <Card className="flex min-h-[180px] flex-col items-center justify-center text-center">
          <h2 className="mb-3 text-lg font-semibold text-white">状态监控</h2>
          <p className="max-w-xs text-sm leading-7 text-[rgba(232,243,255,0.85)]">
            监控设备运行节拍、合格率与告警信息，可视化看板协助掌握趋势，触发应急联动策略。
          </p>
        </Card>
        <Card className="flex min-h-[180px] flex-col items-center justify-center text-center">
          <h2 className="mb-3 text-lg font-semibold text-white">警告记录</h2>
          <p className="max-w-xs text-sm leading-7 text-[rgba(232,243,255,0.85)]">
            近 24 小时告警记录与处理闭环可追溯，支持按机构、班次、告警等级等维度筛选导出。
          </p>
        </Card>
      </div>

      <Card className="p-6 md:p-8">
        <FlowSection />
      </Card>
    </div>
  );
}

function FlowSection() {
  const [activeStep, setActiveStep] = useState(0);
  const timerRef = useRef<number>();
  const stepsCount = FLOW_STEPS.length;

  const scheduleNext = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      setActiveStep((prev) => {
        const next = (prev + 1) % stepsCount;
        scheduleNext();
        return next;
      });
    }, 1800);
  }, [stepsCount]);

  const jumpTo = useCallback(
    (index: number) => {
      if (!Number.isFinite(index)) return;
      const normalized = ((Math.floor(index) % stepsCount) + stepsCount) % stepsCount;
      setActiveStep(normalized);
      scheduleNext();
    },
    [scheduleNext, stepsCount]
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    jumpTo(0);
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [jumpTo]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const api = (index: number) => jumpTo(index);
    (window as typeof window & { setFlowStep?: (index: number) => void }).setFlowStep = api;
    return () => {
      const w = window as typeof window & { setFlowStep?: (index: number) => void };
      if (w.setFlowStep === api) {
        delete w.setFlowStep;
      }
    };
  }, [jumpTo]);

  const steps = useMemo(() => FLOW_STEPS, []);

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white md:text-xl">工作流程</h2>
        <p className="mt-2 text-xs text-[rgba(166,192,220,0.78)] md:text-sm">
          流程示意突出物理环节与数字映射，便于巡检和调度人员快速理解。
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(260px,1fr)_minmax(320px,1.15fr)]">
        <ol className="space-y-3 pl-5 text-sm leading-[1.85] text-[rgba(232,243,255,0.86)]">
          {steps.map((step, index) => {
            const isActive = index === activeStep;
            return (
              <li
                key={step.title}
                className={`relative pl-3 transition-colors duration-200 ${isActive ? "text-[#e9f3ff] font-semibold" : ""}`}
              >
                <span
                  aria-hidden
                  className={`absolute left-[-18px] top-[0.85em] h-1.5 w-1.5 -translate-y-1/2 rounded-full ${
                    isActive ? "bg-[#52a0ff] shadow-[0_0_0_4px_rgba(82,160,255,0.18)]" : "bg-transparent"
                  }`}
                />
                <div className="text-sm text-[rgba(232,243,255,0.88)]">{step.title}</div>
                <p className="mt-1 text-xs leading-6 text-[rgba(166,192,220,0.85)]">{step.description}</p>
              </li>
            );
          })}
        </ol>
        <div className="rounded-2xl border border-[rgba(35,82,126,0.4)] bg-[#0b1d35]/70 p-5">
          <div className="flex items-center gap-3 overflow-x-auto pb-2" aria-live="polite">
            {steps.map((step, index) => {
              const isActive = index === activeStep;
              return (
                <div key={step.pillTitle} className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => jumpTo(index)}
                    className={`flex min-w-[120px] flex-col items-center rounded-xl border px-4 py-3 text-center text-sm transition ${
                      isActive
                        ? "border-[#4a8cff] bg-gradient-to-b from-[#1f5fff] to-[#153a77] text-white shadow-[0_6px_18px_rgba(63,140,255,0.35)]"
                        : "border-[#23527e] bg-[#123048] text-[#cfe3ff]/90 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <span className="text-sm font-semibold">{step.pillTitle}</span>
                    <span className={`mt-1 text-xs ${isActive ? "text-white/90" : "text-[#cfe3ff]/80"}`}>{step.pillMeta}</span>
                  </button>
                  {index < steps.length - 1 ? (
                    <span className="hidden h-[3px] w-10 rounded-full bg-gradient-to-r from-transparent via-[#2b77ff] to-transparent opacity-30 lg:block" />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
