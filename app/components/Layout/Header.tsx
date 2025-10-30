"use client";

import Navigation from "./Navigation";
import Link from "next/link";

export default function Header() {
  return (
    <header className="w-full sticky top-0 z-50 bg-[#142439]/90 backdrop-blur-sm shadow-lg py-4 flex items-center justify-between px-4 md:px-10">
      <div className="flex items-center gap-4">
        <img src="/images/logo.svg" className="h-10 w-10" alt="LOGO"/>
        <span className="text-2xl font-extrabold bg-gradient-to-r from-blue-200 via-cyan-300 to-blue-500 bg-clip-text text-transparent drop-shadow-lg tracking-widest">
          轮毂检测数字孪生平台
        </span>
      </div>
      <div>
        <Link href="/login"
          className="px-5 py-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 text-white font-bold shadow-md hover:scale-105 transition-transform duration-200 ease-in-out">
          管理员入口
        </Link>
      </div>
    </header>
  );
}

