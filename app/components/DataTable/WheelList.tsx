"use client";

import { useEffect, useState } from "react";

interface Wheel {
  id: string;
  wheelNumber: string;
  diameter: number;
  averageBolt: number;
  center: number;
  pcd: number;
  type: string;
}

export default function WheelList() {
  const [wheels, setWheels] = useState<Wheel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWheels();
    // 每10秒刷新一次
    const interval = setInterval(fetchWheels, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchWheels = async () => {
    try {
      const res = await fetch("/api/wheels?limit=50");
      if (res.ok) {
        const data = await res.json();
        setWheels(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch wheels:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white/30 border border-primary-500 rounded p-4 h-full flex items-center justify-center text-white">
        加载中...
      </div>
    );
  }

  return (
    <div className="bg-white/30 border border-primary-500 rounded p-4 h-full relative">
      {/* 背景装饰 */}
      <div className="absolute inset-0 pointer-events-none">
        <img src="/images/bj-1.png" alt="" className="absolute left-0 top-0" />
        <img src="/images/bj-2.png" alt="" className="absolute right-0 top-0" />
        <img src="/images/bj-3.png" alt="" className="absolute right-0 bottom-0" />
        <img src="/images/bj-4.png" alt="" className="absolute left-0 bottom-0" />
      </div>

      <div className="text-white text-base font-semibold mb-4 relative z-10">
        轮毂信息（编号-直径-平均螺栓孔径-中心孔径-孔距-状态）
      </div>

      <div className="h-[calc(100%-60px)] overflow-y-auto relative z-10">
        <div className="space-y-2">
          {wheels.length === 0 ? (
            <div className="text-white text-center py-8">
              暂无数据，请先添加轮毂检测记录
            </div>
          ) : (
            wheels.map((wheel) => (
              <div
                key={wheel.id}
                className="text-white text-sm py-2 px-3 bg-white/10 rounded hover:bg-white/20 transition-colors"
              >
                {wheel.wheelNumber} —— {wheel.diameter} —— {wheel.averageBolt}{" "}
                —— {wheel.center} —— {wheel.pcd} ——{" "}
                <span
                  className={
                    wheel.type === "合格"
                      ? "text-green-400"
                      : "text-red-400"
                  }
                >
                  {wheel.type}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

