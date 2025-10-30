"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
export default function AccountMenu(){
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const username = typeof window!=='undefined'?localStorage.getItem('admin_user')??'管理员':'管理员';
  const handleLogout = () =>{
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    router.replace('/login');
  };
  const handleSwitch = ()=>{
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    router.replace('/login?switch=1'); //切换账号体验
  };
  return (
    <div className="relative">
      <button className="flex items-center gap-2 focus:outline-none px-4 py-2 rounded-lg bg-blue-800/70 hover:bg-cyan-600/70 text-white" onClick={()=>setOpen(v=>!v)}>
        <span className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-300 to-blue-400 flex items-center justify-center text-lg font-black shadow">{username.slice(0,1)}</span>
        <span>{username}</span>
        <svg width="17" height="17" viewBox="0 0 20 20" fill="none"><path d="M5 8l5 5 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-36 rounded shadow-lg bg-white/95 text-blue-900 z-50 border border-cyan-100 divide-y divide-blue-50">
          <div className="px-4 py-2">当前用户：<b>{username}</b></div>
          <button className="w-full text-left px-4 py-2 hover:bg-cyan-100" onClick={handleSwitch}>切换账号</button>
          <button className="w-full text-left px-4 py-2 hover:bg-red-100 text-red-500" onClick={handleLogout}>退出登录</button>
        </div>
      )}
    </div>
  );
}
