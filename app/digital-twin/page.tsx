"use client";

import Card from "../components/Layout/Card";
import ModelViewer from "../components/ThreeViewer/ModelViewer";

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

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-white">工作流程</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-7 text-[rgba(232,243,255,0.85)]">
          <li>轮毂传送至检测工位，对中模块完成精确定位。</li>
          <li>中心夹具升降并旋转，采集径向圆跳动与轴向尺寸。</li>
          <li>侧面夹具伸出夹紧并翻转，捕获侧壁与孔位高精度图像。</li>
          <li>机器视觉完成预处理、边缘提取与尺寸拟合，输出判定结果。</li>
          <li>检测数据写入平台，触发告警或放行，并同步至仓储/ERP 系统。</li>
        </ol>
      </Card>
    </div>
  );
}
