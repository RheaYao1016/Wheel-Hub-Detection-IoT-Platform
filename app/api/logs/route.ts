import { NextResponse } from "next/server";

export async function GET(){
  const now = new Date();
  const items = Array.from({length: 36}, (_,i)=>{
    const d = new Date(now.getTime() - i*3600_000);
    const time = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    return { time, id: String(202504011001 + i), result: i%6===1? '不合格':'合格' };
  });
  return NextResponse.json(items);
}


