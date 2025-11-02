"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Card from "../components/Layout/Card";
import ModelViewer from "../components/ThreeViewer/ModelViewer";

type FlowStep = {
  title: string;
  meta: string;
};

const FLOW_STEPS: FlowStep[] = [
  { title: "入站对中", meta: "夹具锁定" },
  { title: "多面采集", meta: "同步测量" },
  { title: "翻转检测", meta: "轮辋 / 孔位" },
  { title: "视觉判定", meta: "算法输出" },
  { title: "数据联动", meta: "ERP / 仓储" }
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

      <Card className="flow-card">
        <FlowSection />
      </Card>
    </div>
  );
}

function FlowSection() {
  const [activeStep, setActiveStep] = useState(0);
  const timerRef = useRef<number>();
  const steps = useMemo(() => FLOW_STEPS, []);
  const stepsCount = steps.length;

  const progress = stepsCount > 1 ? (activeStep / (stepsCount - 1)) * 100 : 0;

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
    }, 3000);
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
    const setStep = (index: number) => jumpTo(index);
    (window as typeof window & { setCurrentStep?: (index: number) => void }).setCurrentStep = setStep;
    return () => {
      const w = window as typeof window & { setCurrentStep?: (index: number) => void };
      if (w.setCurrentStep === setStep) {
        delete w.setCurrentStep;
      }
    };
  }, [jumpTo]);

  return (
    <section className="flow-section">
      <div className="flow-header">
        <h3>工作流程</h3>
        <p>节点进度条映射生产节拍，高亮当前工序，便于巡检与调度协同。</p>
      </div>
      <div className="flow-track">
        <div className="flow-bar">
          <span className="flow-progress" style={{ width: `${progress}%` }} aria-hidden />
        </div>
        <ul className="flow-steps">
          {steps.map((step, index) => (
            <li key={step.title} className={`flow-step ${index === activeStep ? "active" : ""}`}>
              <span>{step.title}</span>
              <em>{step.meta}</em>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
