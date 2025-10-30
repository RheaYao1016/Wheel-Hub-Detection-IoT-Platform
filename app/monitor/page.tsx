"use client";
import Card from "../components/Layout/Card";
import PieChart from "../components/Charts/PieChart";
import LineChart from "../components/Charts/LineChart";
import { useRef } from "react";
const stats = [
  {label: "轮毂总数", value: 3100, icon: "/images/info-img-1.png"},
  {label: "已检测数", value: 3000, icon: "/images/info-img-2.png"},
  {label: "未检测数", value: 100, icon: "/images/info-img-3.png"},
  {label: "完成率(%)", value: 97, icon: "/images/info-img-4.png"},
];
export default function MonitorPage() {
  const v1 = useRef<HTMLVideoElement>(null);
  const v2 = useRef<HTMLVideoElement>(null);
  const v3 = useRef<HTMLVideoElement>(null);
  const v4 = useRef<HTMLVideoElement>(null);
  const start = async (video: HTMLVideoElement | null) => {
    try { const s = await navigator.mediaDevices.getUserMedia({ video: true }); if(video){ (video as any).srcObject = s; await video.play(); } } catch(e){ alert('无法打开摄像头，请检查权限'); }
  };
  return (
    <main className="max-w-screen-2xl mx-auto pt-6 pb-12 grid grid-cols-1 md:grid-cols-5 lg:grid-cols-7 gap-8 px-2 md:px-8">
      {/* 左列 */}
      <section className="flex flex-col gap-5 md:col-span-2">
        <Card title="实时数据">
          <div className="w-full flex flex-wrap gap-4 items-end justify-between">
            {stats.map(s=>(
              <div className="flex flex-col items-center gap-1 min-w-[90px]">
                <img src={s.icon} className="h-8" alt={s.label}/>
                <span className="text-base font-bold mt-0.5 text-blue-200">{s.label}</span>
                <span className="text-xl md:text-2xl font-black">{s.value}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="尺寸分类" className="pt-2">
          <PieChart title="尺寸分类" data={[{name:"15寸",value:12},{name:"16寸",value:17},{name:"17寸",value:28},{name:"18寸",value:20},{name:"19寸",value:23}]}/>
        </Card>
        <Card title="型号分类" className="pt-2">
          <PieChart title="型号分类" data={[{name:"型号一",value:18},{name:"型号二",value:8},{name:"型号三",value:22},{name:"型号四",value:13},{name:"型号五",value:39}]}/>
        </Card>
      </section>
      {/* 中列：四路摄像头 */}
      <section className="flex flex-col gap-5 md:col-span-3 lg:col-span-3">
        <Card title="摄像头接入 (四路)">
          <div className="grid grid-cols-2 gap-4">
            {[v1,v2,v3,v4].map((ref,idx)=> (
              <div key={idx} className="relative bg-black rounded-lg aspect-video w-full flex items-center justify-center">
                <video ref={ref} className="w-full h-full rounded"/>
                <button onClick={()=>start(ref.current)} className="absolute bottom-2 right-2 px-3 py-1 rounded bg-gradient-to-r from-cyan-400 to-blue-600 text-white shadow">打开摄像头{idx+1}</button>
              </div>
            ))}
          </div>
        </Card>
        <Card title="昨日检测量趋势" className="w-full">
          <div className="w-full h-[200px]"><LineChart title="检测量" data={Array.from({length:24},(_,i)=>({name:`${i+1}点`, value:Math.floor(20+80*Math.random())}))}/></div>
        </Card>
      </section>
      {/* 右列：状态总览+设备列表 */}
      <section className="flex flex-col gap-5 md:col-span-2">
        <Card title="状态总览">
          <ul className="space-y-3">
            {[
              {n:'传送机构', icon:'/images/info-img-1.png'},
              {n:'中心夹具', icon:'/images/info-img-2.png'},
              {n:'侧面夹具', icon:'/images/info-img-3.png'},
              {n:'检测机构', icon:'/images/info-img-4.png'}
            ].map(i=>(
              <li key={i.n} className="flex items-center gap-3">
                <img src={i.icon} className="h-6"/>
                <span className="font-bold text-cyan-100">{i.n}</span>
                <span className="ml-auto flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-400"></span><span className="text-green-300">正常</span></span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="设备列表">
          <ul className="space-y-2 text-base">
            <li className="flex items-center gap-2"><img src="/images/info-img-2.png" className="h-5"/> 检测头-1 <span className="ml-auto text-green-300">在线</span></li>
            <li className="flex items-center gap-2"><img src="/images/info-img-3.png" className="h-5"/> 夹具-2 <span className="ml-auto text-green-300">在线</span></li>
            <li className="flex items-center gap-2"><img src="/images/info-img-1.png" className="h-5"/> 相机-4 <span className="ml-auto text-green-300">在线</span></li>
            <li className="flex items-center gap-2"><img src="/images/info-img-4.png" className="h-5"/> 工控主机-1 <span className="ml-auto text-green-300">在线</span></li>
          </ul>
        </Card>
      </section>
    </main>
  );
}

