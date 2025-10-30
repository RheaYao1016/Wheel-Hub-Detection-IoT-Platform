"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface StatsData {
  totalCount: number;
  testedCount: number;
  untestedCount: number;
  completionRate: number;
}

export default function StatsCards() {
  const [stats, setStats] = useState<StatsData>({
    totalCount: 3100,
    testedCount: 3000,
    untestedCount: 100,
    completionRate: 97,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    // 每30秒刷新一次
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/statistics?type=overview");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    {
      id: 1,
      icon: "/images/info-img-1.png",
      label: "轮毂总数(个)",
      value: stats.totalCount,
    },
    {
      id: 2,
      icon: "/images/info-img-2.png",
      label: "已检测数(个)",
      value: stats.testedCount,
    },
    {
      id: 3,
      icon: "/images/info-img-3.png",
      label: "未检测数(个)",
      value: stats.untestedCount,
    },
    {
      id: 4,
      icon: "/images/info-img-4.png",
      label: "完成率(%)",
      value: stats.completionRate,
    },
  ];

  return (
    <div className="relative bg-white/30 border border-primary-500 rounded p-4">
      {/* 背景装饰 */}
      <Image
        src="/images/bj-1.png"
        alt=""
        className="absolute left-0 top-0"
        width={50}
        height={50}
      />
      <Image
        src="/images/bj-2.png"
        alt=""
        className="absolute right-0 top-0"
        width={50}
        height={50}
      />
      <Image
        src="/images/bj-3.png"
        alt=""
        className="absolute right-0 bottom-0"
        width={50}
        height={50}
      />
      <Image
        src="/images/bj-4.png"
        alt=""
        className="absolute left-0 bottom-0"
        width={50}
        height={50}
      />

      <div className="text-white text-lg font-semibold mb-4 px-4 relative z-10">
        实时数据
      </div>

      <div className="space-y-3 relative z-10">
        {cards.map((card) => (
          <div key={card.id} className="flex items-center gap-3 px-4">
            <div className="flex-shrink-0">
              <Image
                src={card.icon}
                alt={card.label}
                width={40}
                height={40}
              />
            </div>
            <div className="flex-1 text-white">
              <p className="text-sm">{card.label}</p>
              <p className="text-xl font-bold">
                {loading ? "..." : card.value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

