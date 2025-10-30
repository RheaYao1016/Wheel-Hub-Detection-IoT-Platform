"use client";
import Card from "../components/Layout/Card";
import { useState } from "react";
import ModelViewer from "../components/ThreeViewer/ModelViewer";
export default function DigitalTwinPage() {
  const [scale,setScale]=useState(1);
  return (
    <div className="max-w-7xl mx-auto px-2 py-6 flex flex-col gap-6 items-center justify-start min-h-[60vh]">
      <h1 className="text-2xl md:text-3xl font-extrabold text-center -mt-2 bg-gradient-to-r from-cyan-400 via-blue-400 to-sky-500 bg-clip-text text-transparent tracking-wide">三维模型展示</h1>
      <Card className="w-full">
        <div className="grid grid-cols-12 gap-6 items-center">
          <div className="col-span-12 md:col-span-2 flex items-center justify-center">
            <img src="/images/TianXiaWuShuang.png" className="w-full max-w-[220px] rounded-lg shadow" alt="左图"/>
          </div>
          <div className="col-span-12 md:col-span-8 h-[420px] rounded-xl overflow-hidden bg-[#0f1f35]/60">
            <ModelViewer />
          </div>
          <div className="col-span-12 md:col-span-2 flex items-center justify-center">
            <img src="/images/she_bei_jian_mo.png" className="w-full max-w-[220px] rounded-lg shadow" alt="右图"/>
          </div>
        </div>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        <Card title="实时参数">传感器/尺寸/状态等参数映射</Card>
        <Card title="状态监控">设备运行状态、合格率、报警信息</Card>
        <Card title="告警记录">近24小时告警记录与事件处理</Card>
      </div>
      <Card title="工作流程" className="w-full">
        <ol className="list-decimal pl-6 space-y-2 text-neutral-200">
          <li>轮毂传送至检测工位，对中模块将其定位。</li>
          <li>中心夹具升降与旋转，采集径向圆跳动。</li>
          <li>侧面夹具伸出夹持，翻转拍摄侧向尺寸。</li>
          <li>图像处理识别尺寸，计算合格/不合格。</li>
          <li>结果入库，触发告警或放行至下一工位。</li>
        </ol>
      </Card>
    </div>
  );
}
