"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavigationProps {
  position: "left" | "right";
}

export default function Navigation({ position }: NavigationProps) {
  const pathname = usePathname();

  const leftButtons = [
    { href: "/", label: "主页" },
    { href: "/visualize", label: "可视化平台" },
  ];

  const rightButtons = [
    { href: "/monitor", label: "实时监控" },
    { href: "/digital-twin", label: "数字孪生" },
  ];

  const buttons = position === "left" ? leftButtons : rightButtons;
  const containerClass = position === "left" 
    ? "flex ml-[50px]" 
    : "flex mr-[50px]";

  return (
    <nav className={containerClass}>
      {buttons.map((button) => {
        const isActive = pathname === button.href;
        return (
          <Link
            key={button.href}
            href={button.href}
            className={`px-4 py-2.5 bg-[#00008B] text-white border-none cursor-pointer text-base font-semibold w-[200px] h-10 text-center transition-all hover:bg-[#6a6aef] ${
              isActive ? "bg-[#6a6aef] underline" : ""
            }`}
          >
            {button.label}
          </Link>
        );
      })}
    </nav>
  );
}

