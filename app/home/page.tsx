import Card from "../components/Layout/Card";
export default function HomeIntro(){
  return (
    <main className="max-w-6xl mx-auto px-3 py-8 flex flex-col gap-6">
      <Card title="项目简介">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <img src="/images/TianXiaWuShuang.png" className="w-full aspect-[4/3] object-cover rounded-lg shadow mx-auto" alt="装置示意"/>
          <div className="space-y-4 leading-8 text-neutral-100 max-w-[680px]">
            <p>本项目面向自动化产线的轮毂尺寸/形状检测，围绕“对中、夹紧、升降、旋转、翻转、拍摄、识别、判定、追溯”完整闭环构建硬件与软件一体化方案。装置通过模块化机构完成多角度采集与稳定夹持，结合机器视觉算法实现关键尺寸识别；平台侧提供统计、态势、趋势、告警等可视化能力。</p>
            <p>系统采用单工位模块化设计：对中模块精准定位、中心夹具升降与旋转实现圆跳动测量、侧面夹具伸出与翻转实现侧向尺寸测量；采集图像经预处理、阈值分割、边缘与尺寸检测得到结果并入库，与看板联动形成数据闭环。</p>
          </div>
        </div>
      </Card>
      <Card title="研究目的">
        <p className="leading-8 text-neutral-100 max-w-[680px]">在大规模制造场景中，轮毂等关键件的加工精度直接影响安全与寿命。通过自动化机构与视觉检测替代人工，提高检测效率与一致性，降低人为误差，实现“更快、更稳、更准”的生产质量管理。</p>
      </Card>
      <Card title="创新特色">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <ul className="list-disc pl-6 space-y-2 text-neutral-100 max-w-[680px]">
            <li>单工位模块化：多机构合一，节省空间、易维护、可扩展。</li>
            <li>中心夹具：升降+旋转复合，实现径向圆跳动高精测量。</li>
            <li>侧面夹具：伸出夹持与翻转，覆盖关键侧向尺寸项目。</li>
            <li>视觉识别：灰度化/滤波/阈值/边缘检测+尺寸拟合，稳定可靠。</li>
            <li>可视化：统计、趋势、监控、告警联动，数据闭环一目了然。</li>
          </ul>
          <div className="grid grid-cols-2 gap-4">
            <img src="/images/she_bei_jian_mo.png" className="rounded shadow aspect-[4/3] object-cover" alt="机构结构"/>
            <img src="/images/bj-1.png" className="rounded shadow aspect-[4/3] object-cover" alt="装置细节1"/>
            <img src="/images/bj-2.png" className="rounded shadow aspect-[4/3] object-cover" alt="装置细节2"/>
            <img src="/images/bj-3.png" className="rounded shadow aspect-[4/3] object-cover" alt="装置细节3"/>
          </div>
        </div>
      </Card>
    </main>
  );
}
