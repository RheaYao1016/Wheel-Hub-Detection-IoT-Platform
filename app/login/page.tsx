"use client";
import Card from "../components/Layout/Card";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
export default function Login() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState(params.get('switch')==='1'?"login":"login");
  const [showPwd, setShowPwd] = useState(false);
  const [showRegPwd, setShowRegPwd] = useState(false);
  const [msg,setMsg] = useState("");
  // 表单状态
  const [username,setUsername]=useState("");
  const [password,setPassword]=useState("");
  const [reguser,setReguser]=useState("");
  const [regpwd,setRegpwd]=useState("");
  const [regpwd2,setRegpwd2]=useState("");
  function doLogin(e:any){
    e.preventDefault();
    if(!username||!password){setMsg("请输入账号和密码");return;}
    localStorage.setItem('admin_token','active');
    localStorage.setItem('admin_user',username);
    router.push("/admin");
  }
  function doRegister(e:any){
    e.preventDefault();
    if(!reguser||!regpwd||!regpwd2){setMsg("请完整填写注册信息");return;}
    if(regpwd.length<6){setMsg("密码至少6位");return;}
    if(regpwd!==regpwd2){setMsg("两次密码不一致");return;}
    localStorage.setItem('admin_user',reguser);
    setMsg("注册成功，请登录");
    setTimeout(()=>{setMode("login"); setMsg("")},1200);
  }
  return (
    <div className="min-h-screen flex flex-col justify-center items-center relative bg-gradient-to-br from-[#142439] via-[#243859] to-[#2a7ad7] overflow-hidden">
      <img src="/images/wheel-bg.svg" alt="" className="absolute z-0 w-[80vw] max-w-[520px] left-1/2 top-[24%] -translate-x-1/2 opacity-35 blur-sm pointer-events-none select-none"/>
      <Card className="relative z-10 w-full max-w-md px-8 pt-10 pb-8 ">
        <div className="flex justify-center gap-2 mb-8">
          <button className={`text-xl font-bold pb-1 px-4 border-b-2 transition-all duration-200 ${mode==='login'? 'border-cyan-400 text-cyan-200':'border-transparent text-white/60'}`} onClick={()=>{setMode('login');setMsg('')}}>登录</button>
          <button className={`text-xl font-bold pb-1 px-4 border-b-2 transition-all duration-200 ${mode==='reg'? 'border-cyan-400 text-cyan-200':'border-transparent text-white/60'}`} onClick={()=>{setMode('reg');setMsg('')}}>注册</button>
        </div>
        {mode==='login'? (
          <form className="flex flex-col gap-6 w-full" onSubmit={doLogin}>
            <input className="rounded px-4 py-3 bg-dark/70 text-white text-lg placeholder:text-cyan-200 focus:ring-2 focus:ring-cyan-400" placeholder="请输入账号" autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} />
            <div className="relative">
              <input type={showPwd?"text":"password"} className="rounded px-4 py-3 pr-10 bg-dark/70 text-white text-lg placeholder:text-cyan-200 focus:ring-2 focus:ring-cyan-400 w-full" placeholder="请输入密码" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} />
              <span className="absolute top-3 right-3 cursor-pointer" onClick={()=>setShowPwd(v=>!v)}>
                {showPwd? (<svg width="22" height="22" fill="none" viewBox="0 0 22 22"><path d="M2.8 11C4.8 6.8 8.4 4.6 11 4.6s6.2 2.2 8.2 6.4c-2 4.2-5.6 6.4-8.2 6.4s-6.2-2.2-8.2-6.4z" stroke="#38bdf8" strokeWidth="2"/><circle cx="11" cy="11" r="3" fill="#38bdf8" /></svg>) : (<svg width="22" height="22" fill="none" viewBox="0 0 22 22"><path d="M1 1l20 20M2.8 11C4.8 6.8 8.4 4.6 11 4.6c1.8 0 4.3 1.2 6.1 3.3M13.5 13.5A3 3 0 0 1 7.7 9.1m-.3 4.4C6.2 12.1 5 10.7 2.8 11m12.3 2.1c1 .6 2.3 1.6 4.1 1.8" stroke="#38bdf8" strokeWidth="2"/></svg>)}
              </span>
            </div>
            <button type="submit" className="w-full py-3 mt-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 text-xl font-bold text-white shadow-lg hover:scale-105 transition-all">登录</button>
            <div className="h-2 text-center text-red-300 font-semibold text-sm">{msg}</div>
          </form>
        ) : (
          <form className="flex flex-col gap-6 w-full" onSubmit={doRegister}>
            <input className="rounded px-4 py-3 bg-dark/70 text-white text-lg placeholder:text-cyan-200 focus:ring-2 focus:ring-cyan-400" placeholder="请输入账号" autoComplete="username" value={reguser} onChange={e=>setReguser(e.target.value)} />
            <div className="relative">
              <input type={showRegPwd?"text":"password"} className="rounded px-4 py-3 pr-10 bg-dark/70 text-white text-lg placeholder:text-cyan-200 focus:ring-2 focus:ring-cyan-400 w-full" placeholder="请输入密码（至少6位）" autoComplete="new-password" value={regpwd} onChange={e=>setRegpwd(e.target.value)} />
              <span className="absolute top-3 right-3 cursor-pointer" onClick={()=>setShowRegPwd(v=>!v)}>
                {showRegPwd? (<svg width="22" height="22" fill="none" viewBox="0 0 22 22"><path d="M2.8 11C4.8 6.8 8.4 4.6 11 4.6s6.2 2.2 8.2 6.4c-2 4.2-5.6 6.4-8.2 6.4s-6.2-2.2-8.2-6.4z" stroke="#38bdf8" strokeWidth="2"/><circle cx="11" cy="11" r="3" fill="#38bdf8" /></svg>):(<svg width="22" height="22" fill="none" viewBox="0 0 22 22"><path d="M1 1l20 20M2.8 11C4.8 6.8 8.4 4.6 11 4.6c1.8 0 4.3 1.2 6.1 3.3M13.5 13.5A3 3 0 0 1 7.7 9.1m-.3 4.4C6.2 12.1 5 10.7 2.8 11m12.3 2.1c1 .6 2.3 1.6 4.1 1.8" stroke="#38bdf8" strokeWidth="2"/></svg>)}
              </span>
            </div>
            <input type={showRegPwd?"text":"password"} className="rounded px-4 py-3 bg-dark/70 text-white text-lg placeholder:text-cyan-200 focus:ring-2 focus:ring-cyan-400" placeholder="重复密码" autoComplete="new-password" value={regpwd2} onChange={e=>setRegpwd2(e.target.value)} />
            <button type="submit" className="w-full py-3 mt-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 text-xl font-bold text-white shadow-lg hover:scale-105 transition-all">注册</button>
            <div className="h-2 text-center text-pink-300 font-semibold text-sm">{msg}</div>
          </form>
        )}
      </Card>
    </div>
  );
}
