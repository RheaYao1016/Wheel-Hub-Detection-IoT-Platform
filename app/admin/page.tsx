"use client";
import Card from "../components/Layout/Card";
import LineChart from "../components/Charts/LineChart";
import PieChart from "../components/Charts/PieChart";
import { useState, useEffect } from "react";
const mockData = Array.from({length:72}, (_,i)=>({id: 202504011001 + i, value: Math.floor(200*Math.random()+300), time: `${(i%24)+1}时`}));
const batchStats = [
  {label: "总轮毂", icon: "/images/info-img-1.png", val: 3100},
  {label: "今日检测", icon: "/images/info-img-2.png", val: 210},
  {label: "本周入库", icon: "/images/info-img-4.png", val: 392},
  {label: "告警数", icon: "/images/info-img-3.png", val: 3},
];
function StatTicker(){
  const [idx,setIdx] = useState(0);
  useEffect(()=>{const t = setInterval(()=>setIdx(i=>(i+4)%batchStats.length), 2000);return ()=>clearInterval(t);},[]);
  // 连续滑动四组数据批量展示
  return (
    <div className="flex flex-wrap gap-3 justify-between py-1 w-full animate-fadein">
      {batchStats.concat(batchStats).slice(idx,idx+4).map(s=>(
        <div className="flex flex-col items-center gap-1 bg-[#1d314a]/60 px-5 py-4 rounded-xl shadow min-w-[150px]">
          <img src={s.icon} className="h-9" alt={s.label}/>
          <div className="text-blue-300 text-sm">{s.label}</div>
          <div className="text-4xl font-black text-cyan-200 leading-tight">{s.val}</div>
        </div>
      ))}
    </div>
  );
}
export default function AdminPage() {
  return (
    <div className="max-w-screen-2xl mx-auto px-3 py-8 min-h-[95vh] flex flex-col gap-8">
      <h1 className="text-2xl md:text-3xl font-extrabold mb-6 text-center text-cyan-300 tracking-widest mt-2">管理员后台管理台</h1>
      <StatTicker />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card title="设备台账"><div className="text-center text-base md:text-lg">10台设备</div></Card>
        <Card title="轮毂管理"><div className="text-center">70条记录</div><button className="mt-3 px-3 py-2 rounded bg-gradient-to-r from-cyan-400 to-blue-600 text-sm text-white">新增轮毂</button></Card>
        <Card title="数据分析"><div className="text-center">检测数据趋势、合格率、告警类型等统计</div></Card>
        <Card title="操作日志"><div className="text-center">最后登录时间 2025-10-30</div><button className="mt-3 px-3 py-2 rounded bg-blue-900/60 text-sm text-cyan-200">导出日志</button></Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
        <Card title="每日检测量趋势"><div className="w-full h-[240px]"><LineChart data={mockData.slice(0,24).map(d=>({name:d.time,value:d.value}))}/></div></Card>
        <Card title="合格率占比"><div className="w-full h-[240px]"><PieChart title="合格占比" data={[{name:"合格",value:88},{name:"不合格",value:12}]}/></div></Card>
      </div>
      <div className="w-full flex flex-row gap-6 justify-end mb-6">
        <button className="px-7 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 text-lg font-bold text-white shadow hover:scale-105 transition-all">数据同步</button>
        <button className="px-7 py-2 rounded-xl bg-gradient-to-r from-green-400 to-blue-400 text-lg font-bold text-white shadow hover:scale-105 transition-all">批量导入</button>
        <button className="px-7 py-2 rounded-xl bg-gradient-to-r from-red-400 to-pink-400 text-lg font-bold text-white shadow hover:scale-105 transition-all">风险告警</button>
      </div>
    </div>
  );
}
