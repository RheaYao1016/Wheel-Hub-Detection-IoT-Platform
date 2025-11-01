"use client";

import { useEffect, useMemo, useRef } from "react";
import Card from "../components/Layout/Card";
import PieChart from "../components/Charts/PieChart";
import LineChart from "../components/Charts/LineChart";

const SIZE_DONUT = [
  { name: "15寸", value: 12 },
  { name: "16寸", value: 17 },
  { name: "17寸", value: 28 },
  { name: "18寸", value: 20 },
  { name: "19寸", value: 23 }
];

const MODEL_DONUT = [
  { name: "型号 A", value: 18 },
  { name: "型号 B", value: 8 },
  { name: "型号 C", value: 22 },
  { name: "型号 D", value: 13 },
  { name: "型号 E", value: 39 }
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

const buildTrend = () => buildLabels().map((label) => ({ name: label, value: Math.round(40 + Math.random() * 60) }));

export default function MonitorPage() {
  const trendData = useMemo(buildTrend, []);
  const videoRefs = [useRef<HTMLVideoElement>(null), useRef<HTMLVideoElement>(null), useRef<HTMLVideoElement>(null), useRef<HTMLVideoElement>(null)];

  useEffect(() => {
    return () => {
      videoRefs.forEach((ref) => {
        const stream = ref.current?.srcObject as MediaStream | undefined;
        stream?.getTracks().forEach((track) => track.stop());
      });
    };
  }, [videoRefs]);

  const startCamera = async (index: number) => {
    const target = videoRefs[index].current;
    if (!target) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      target.srcObject = stream;
      await target.play();
    } catch (error) {
      alert("无法打开摄像头，请检查浏览器权限设置。");
    }
  };

  return (
    <div className="page-shell pt-0 pb-10">
      <Card>
        <h1 className="mb-4 text-lg font-semibold text-white md:text-xl">摄像头接入（四路）</h1>
        <div className="grid gap-4 md:grid-cols-2">
          {videoRefs.map((ref, idx) => (
            <div key={idx} className="relative aspect-video overflow-hidden rounded-2xl border border-[rgba(91,189,247,0.16)] bg-black/80">
              <video ref={ref} className="h-full w-full object-cover" muted playsInline></video>
              <button
                type="button"
                onClick={() => startCamera(idx)}
                className="absolute bottom-3 right-3 rounded-full bg-gradient-to-r from-[#5bbdf7] to-[#4f82f4] px-4 py-2 text-sm font-semibold text-[#041629] shadow-[0_8px_20px_rgba(91,189,247,0.25)]"
              >
                查看监控
              </button>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        <Card className="col-span-1 md:col-span-7">
          <h2 className="mb-3 text-lg font-semibold text-white">昨日检测量趋势</h2>
          <div className="h-[320px]">
            <LineChart data={trendData} />
          </div>
        </Card>
        <Card className="col-span-1 md:col-span-5">
          <h2 className="mb-4 text-lg font-semibold text-white">状态总览</h2>
          <ul className="space-y-3 text-sm text-[rgba(232,243,255,0.85)]">
            {[
              { name: "传送机构", status: "正常" },
              { name: "中心夹具", status: "正常" },
              { name: "侧面夹具", status: "正常" },
              { name: "检测机构", status: "正常" }
            ].map((item) => (
              <li key={item.name} className="flex items-center gap-3 rounded-xl border border-[rgba(91,189,247,0.14)] bg-[rgba(91,189,247,0.06)] px-4 py-3">
                <span className="h-3 w-3 rounded-full bg-[#51d3c3]"></span>
                <span className="text-base text-white">{item.name}</span>
                <span className="ml-auto flex items-center gap-2 text-sm text-[#51d3c3]">
                  <span className="h-2 w-2 rounded-full bg-[#51d3c3]"></span>
                  {item.status}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        <Card className="col-span-1 md:col-span-6">
          <h2 className="mb-3 text-lg font-semibold text-white">尺寸分类占比</h2>
          <PieChart title="尺寸分类" data={SIZE_DONUT} />
        </Card>
        <Card className="col-span-1 md:col-span-6">
          <h2 className="mb-3 text-lg font-semibold text-white">型号分类占比</h2>
          <PieChart title="型号分类" data={MODEL_DONUT} />
        </Card>
      </div>
    </div>
  );
}
