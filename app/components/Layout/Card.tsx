import { ReactNode } from "react";
export default function Card({children, title, className = ""}: {children:ReactNode, title?:string, className?:string}) {
  return (
    <div className={"bg-white/15 backdrop-blur-lg rounded-[14px] shadow-[0_8px_20px_rgba(0,0,0,.18)] border border-white/10 p-5 mb-3 "+className}>
      {title && (
        <div className="mb-3 flex items-center gap-2">
          <span className="flex-shrink-0 block w-2 h-2 rounded-full bg-gradient-to-tr from-cyan-300 to-blue-500 shadow-cyan-400/30 shadow mr-2"></span>
          <span className="text-lg font-bold text-cyan-300 tracking-wider drop-shadow">{title}</span>
        </div>
      )}
      {children}
    </div>
  );
}
