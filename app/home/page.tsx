import Card from "../components/Layout/Card";

const INTRO_COPY = `本项目聚焦“多功能轮毂尺寸形状检测一体化设备”，整合传送、定位、夹具、机器视觉与可视化平台，构建传送→定位→夹持→多角度采集→识别→判定→追溯的自动化闭环。装置通过模块化机构实现升降、旋转与翻转，视觉系统输出关键尺寸并同步至平台形成统计、告警与追溯能力。`;
const PURPOSE_COPY = `随着汽车保有量持续攀升，轮毂几何精度直接关系行驶安全与轮胎寿命。传统人工检测效率低且易受经验影响，难以支撑智能化产线对质量与安全的双重要求。本项目以自动化机械机构配合视觉测量提升检测效率与精度，确保生产过程稳定可控，降低操作风险，实现符合标准的批量交付。`;
const FEATURES = [
  "单工位模块化集成：传输、定位、检测协同运行，节省空间并便于维护扩展。",
  "中心夹具复合运动：升降与旋转结合，保障圆跳动及轴向尺寸测量精度。",
  "侧面夹具翻转检测：覆盖孔位、轮缘等关键侧向尺寸，实现全方位采集。",
  "机器视觉识别：灰度化、滤波、阈值与边缘拟合流程输出稳定尺寸判定。",
  "可视化平台联动：统计、趋势、监控、告警互通，形成数据闭环管理。",
  "PLC 控制架构：S7-1200 与传感执行单元协同，提供安全互锁与远程监控。"
];

export default function HomeIntro() {
  return (
    <div className="page-shell pt-0 pb-8">
      <Card className="p-6 md:p-8">
        <div className="grid items-center gap-8 md:grid-cols-[minmax(260px,1fr)_minmax(360px,1.2fr)]">
          <div className="flex max-w-[520px] items-center justify-center rounded-2xl bg-[rgba(91,189,247,0.08)] p-6">
            <img src="/images/TianXiaWuShuang.png" alt="轮毂检测设备整体示意" className="h-full w-full object-contain" />
          </div>
          <div className="space-y-4 text-[15px] leading-8 text-[rgba(232,243,255,0.88)]">
            <h2 className="text-2xl font-semibold text-white">项目简介</h2>
            <p>{INTRO_COPY}</p>
          </div>
        </div>
      </Card>

      <Card className="p-6 md:p-8">
        <div className="grid items-center gap-8 md:grid-cols-[minmax(260px,1fr)_minmax(360px,1.2fr)]">
          <div className="order-last flex max-w-[520px] items-center justify-center rounded-2xl bg-[rgba(91,189,247,0.08)] p-6 md:order-first">
            <img src="/images/digital_bcgd.jpg" alt="轮毂检测研究目的" className="h-full w-full object-contain rounded-xl" />
          </div>
          <div className="space-y-4 text-[15px] leading-8 text-[rgba(232,243,255,0.88)]">
            <h2 className="text-2xl font-semibold text-white">研究目的</h2>
            <p>{PURPOSE_COPY}</p>
          </div>
        </div>
      </Card>

      <Card className="p-6 md:p-8">
        <div className="grid items-start gap-8 md:grid-cols-[minmax(260px,1fr)_minmax(360px,1.2fr)]">
          <div className="space-y-4 text-[15px] leading-7 text-[rgba(232,243,255,0.9)]">
            <h2 className="text-2xl font-semibold text-white">创新特色</h2>
            <ul className="space-y-3">
              {FEATURES.map((item) => (
                <li key={item} className="relative pl-4">
                  <span className="absolute left-0 top-3 h-2 w-2 -translate-y-1/2 rounded-full bg-[#5bbdf7]"></span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-[rgba(91,189,247,0.08)] p-4">
              <img src="/images/she_bei_jian_mo.png" alt="设备结构示意" className="h-full w-full object-contain" />
            </div>
            <div className="rounded-2xl bg-[rgba(91,189,247,0.08)] p-4">
              <img src="/images/bj-1.png" alt="检测细节 1" className="h-full w-full object-contain" />
            </div>
            <div className="rounded-2xl bg-[rgba(91,189,247,0.08)] p-4">
              <img src="/images/bj-2.png" alt="检测细节 2" className="h-full w-full object-contain" />
            </div>
            <div className="rounded-2xl bg-[rgba(91,189,247,0.08)] p-4">
              <img src="/images/bj-3.png" alt="检测细节 3" className="h-full w-full object-contain" />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
