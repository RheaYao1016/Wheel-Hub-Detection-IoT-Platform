"use client";
import { useEffect, useState } from "react";

interface LogItem { time: string; id: string; result: "合格"|"不合格" }

function genMock(size=24): LogItem[]{
  const base = 202504011001;
  const now = new Date();
  const list: LogItem[] = [];
  for(let i=0;i<size;i++){
    const d = new Date(now.getTime() - i*3600_000);
    const t = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    list.push({ time: t, id: String(base+i), result: i%6===1? '不合格':'合格' });
  }
  return list;
}

export default function LogList(){
  const [items,setItems] = useState<LogItem[]>([]);
  useEffect(()=>{
    fetch('/api/logs').then(r=>r.json()).then(setItems).catch(()=>setItems(genMock(36)));
  },[]);
  return (
    <div className="max-h-[470px] overflow-auto">
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-cyan-200 text-sm px-2 py-1 sticky top-0 bg-[#0f2037]/60 backdrop-blur z-10">
        <span>时间</span><span>编号</span><span>结论</span>
      </div>
      <ul className="divide-y divide-white/10">
        {items.map(it=> (
          <li key={it.id} className="grid grid-cols-[1fr_1fr_auto] gap-3 px-2 py-2 text-sm hover:bg-white/5">
            <span className="text-blue-200">{it.time}</span>
            <span className="font-mono">{it.id}</span>
            <span className={it.result==='合格'? 'text-green-300':'text-red-300'}>{it.result}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}


