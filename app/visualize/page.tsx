"use client";
import Card from "../components/Layout/Card";
import PieChart from "../components/Charts/PieChart";
import LineChart from "../components/Charts/LineChart";
import { useEffect, useMemo, useState } from "react";

const initTrend = () => Array.from({ length: 30 }, (_, i) => ({ name: `${i+1}日`, value: Math.floor(Math.random()*300+80) }));
const projectMock = Array.from({ length: 60 }, (_, i) => ({ id: String(202504011001 + i), result: i % 7 === 1 ? "不合格" : "合格", time: `2025-10-${(i%30+1).toString().padStart(2,'0')} 1${i%10}:3${i%6}` }));

function ProjectTicker(){
  const [start,setStart] = useState(0);
  useEffect(()=>{const t=setInterval(()=>setStart(s=> (s+1)%projectMock.length),1500);return ()=>clearInterval(t);},[]);
  const list = projectMock.concat(projectMock).slice(start, start+18);
  return (
    <div className="h-[520px] overflow-hidden">
      <div className="mb-2 flex items-center gap-2">
        <input className="flex-1 bg-[#173a60]/60 rounded px-2 py-1 text-sm text-cyan-100 placeholder:text-blue-200/60" placeholder="搜索项目号/结果"/>
        <button className="px-2 py-1 rounded bg-blue-900/60 text-cyan-200 text-sm">筛选</button>
      </div>
      <ul className="text-base text-neutral-100 space-y-2 animate-fadein overflow-y-auto pr-1" style={{maxHeight:468}}>
        {list.map(item=> (
          <li key={item.id} className="flex items-center gap-3 bg-[#18314d]/50 rounded px-3 py-2 hover:bg-[#1d3a59]/60">
            <span className={`w-2 h-2 rounded-full ${item.result==='合格'?'bg-green-400':'bg-red-400'}`}></span>
            <span className="text-sm text-blue-200">{item.time}</span>
            <span className="font-mono">{item.id}</span>
            <span className={`ml-auto text-sm ${item.result==='合格'?'text-green-300':'text-red-300'}`}>{item.result}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MechanismStatus(){
  const items = [
    {name:'传送机构', ok:true},
    {name:'中心夹具', ok:true},
    {name:'侧面夹具', ok:true},
    {name:'检测机构', ok:true},
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map(i=> (
        <div key={i.name} className="flex items-center gap-3 bg-[#18314d]/60 rounded-lg px-3 py-2">
          <span className={`w-2 h-2 rounded-full ${i.ok? 'bg-green-400':'bg-red-400'}`}></span>
          <span className="text-base md:text-lg font-bold text-cyan-100">{i.name}</span>
          <span className={`ml-auto text-sm ${i.ok? 'text-green-300':'text-red-300'}`}>{i.ok? '正常':'故障'}</span>
        </div>
      ))}
    </div>
  );
}

export default function VisualizePage() {
  const [trend,setTrend] = useState(initTrend());
  useEffect(()=>{ const t=setInterval(()=>{
    setTrend(prev=> prev.slice(1).concat({ name:`${(prev.length%30)+1}日`, value: Math.floor(Math.random()*300+80)}));
  }, 1500); return ()=>clearInterval(t); },[]);

  return (
    <main className="max-w-screen-2xl mx-auto pt-6 pb-16 grid grid-cols-1 md:grid-cols-5 lg:grid-cols-7 gap-8 px-2 md:px-8">
      {/* 左列：统计/合格率/日志预览 */}
      <section className="flex flex-col gap-5 md:col-span-2">
        <Card title="统计信息">
          <div className="w-full grid grid-cols-2 gap-4 items-end">
            <div className="flex flex-col items-center gap-1"><img src="/images/info-img-1.png" className="h-10"/><div className="text-blue-200 text-lg">总检测数</div><div className="text-3xl font-black">3100</div></div>
            <div className="flex flex-col items-center gap-1"><img src="/images/info-img-2.png" className="h-10"/><div className="text-blue-200 text-lg">已上传</div><div className="text-3xl font-black">3000</div></div>
            <div className="flex flex-col items-center gap-1"><img src="/images/info-img-3.png" className="h-10"/><div className="text-blue-200 text-lg">未上传</div><div className="text-3xl font-black">100</div></div>
            <div className="flex flex-col items-center gap-1"><img src="/images/info-img-4.png" className="h-10"/><div className="text-blue-200 text-lg">合格率(%)</div><div className="text-3xl font-black">97</div></div>
          </div>
        </Card>
        <Card title="检测合格率" className="pt-2"><PieChart title="检测合格率" data={[{name:"合格",value:92},{name:"不合格",value:8}]}/></Card>
        <Card title="检测日志预览"><ProjectTicker /></Card>
      </section>
      {/* 中列：标题+视频 + 趋势 */}
      <section className="flex flex-col gap-5 md:col-span-3 lg:col-span-3">
        <Card className="min-h-[280px] flex flex-col">
          <div className="w-full text-center -mt-2 mb-1"><span className="text-2xl md:text-3xl font-extrabold text-cyan-300 tracking-widest">三维模型展示</span></div>
          <div className="flex-1 flex items-center justify-center">
            <video className="w-[90%] max-w-2xl rounded-lg shadow bg-black" controls muted loop src="https://www.w3schools.com/html/mov_bbb.mp4"></video>
          </div>
        </Card>
        <Card title="检测量走势" className="pt-2"><div className="w-full h-[260px]"><LineChart data={trend}/></div></Card>
      </section>
      {/* 右列：机构状态 + 设备 + 实时项目列表 */}
      <section className="flex flex-col gap-5 md:col-span-2">
        <Card title="机构状态"><MechanismStatus /></Card>
        <Card title="当前检测设备"><ul className="text-base md:text-lg text-neutral-200 list-disc pl-4"><li>相机A</li><li>检测机1号</li><li>夹持/推送装置</li></ul></Card>
        <Card title="实时项目列表" className="flex-1"><ProjectTicker /></Card>
      </section>
    </main>
  );
}
