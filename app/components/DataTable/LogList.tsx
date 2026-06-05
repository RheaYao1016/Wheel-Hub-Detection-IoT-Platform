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
      {/* Desktop table header - hidden on mobile */}
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-sm px-2 py-1 sticky top-0 backdrop-blur z-10 log-list-header">
        <span>时间</span><span>编号</span><span>结论</span>
      </div>
      <ul className="log-list-body">
        {items.map(it=> (
          <li key={it.id} className="grid grid-cols-[1fr_1fr_auto] gap-3 px-2 py-2 text-sm log-list-item">
            <span className="log-list-time">{it.time}</span>
            <span className="font-mono">{it.id}</span>
            <span className={it.result==='合格'? 'log-list-pass':'log-list-fail'}>{it.result}</span>
          </li>
        ))}
      </ul>

      {/* Mobile card view - visible only on mobile via CSS */}
      <div className="mobile-log-cards">
        {items.map(it=> (
          <div key={`mobile-${it.id}`} className="mobile-data-card">
            <div className="mobile-data-card-header">
              <span className="mobile-data-card-title">#{it.id}</span>
              <span className={
                it.result === '合格'
                  ? 'status-chip' 
                  : 'status-chip'
              } style={{
                background: it.result === '合格' 
                  ? 'color-mix(in srgb, var(--success, #22c55e) 18%, transparent)' 
                  : 'color-mix(in srgb, var(--danger, #ef4444) 18%, transparent)',
                color: it.result === '合格' ? 'var(--success, #22c55e)' : 'var(--danger, #ef4444)',
              }}>
                {it.result}
              </span>
            </div>
            <div className="mobile-data-card-row">
              <span className="mobile-data-card-label">检测时间</span>
              <span className="mobile-data-card-value">{it.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


