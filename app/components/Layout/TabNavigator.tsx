"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
const tabs = [
  {label: "主页", path: "/home", key: "home"},
  {label: "可视化平台", path: "/visualize", key: "visualize"},
  {label: "实时监控", path: "/monitor", key: "monitor"},
  {label: "数字孪生", path: "/digital-twin", key: "digital"}
];
export default function TabNavigator({ extra }: { extra?: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <nav className="w-full flex items-center justify-between py-3 px-2 md:px-7 bg-[#172c47]/90 shadow-md backdrop-blur sticky top-0 z-20 gap-2">
      <div className="flex flex-row gap-1 md:gap-3">
        {tabs.map(tab => (
          <button key={tab.key}
            className={`px-4 py-2 rounded-t-xl font-bold text-base tracking-wide transition-all duration-150 ${pathname===tab.path ? "bg-gradient-to-tr from-cyan-400 to-blue-500 text-white shadow-md scale-105" : "text-cyan-200 hover:text-cyan-100 bg-gray-900/10"}`}
            onClick={()=>router.push(tab.path)}>{tab.label}</button>
        ))}
      </div>
      <div>{extra}</div>
    </nav>
  );
}
