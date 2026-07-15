"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import NumberFlow from "@number-flow/react";
import { Activity } from "lucide-react";
import { useLocale } from "../Locale/LocaleProvider";
import { Card, CardContent } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { getApiPath } from "@/lib/api-path";
import { getImagePath } from "@/lib/image-path";

interface StatsData {
  totalCount: number;
  testedCount: number;
  untestedCount: number;
  completionRate: number;
}

const DEFAULT_STATS: StatsData = {
  totalCount: 3100,
  testedCount: 3000,
  untestedCount: 100,
  completionRate: 97,
};

const CORNER_IMAGES = [
  { src: "/images/bj-1.png", position: "left-0 top-0" },
  { src: "/images/bj-2.png", position: "right-0 top-0" },
  { src: "/images/bj-3.png", position: "right-0 bottom-0" },
  { src: "/images/bj-4.png", position: "left-0 bottom-0" },
];

export default function StatsCards() {
  const { text } = useLocale();
  const [stats, setStats] = useState<StatsData>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(getApiPath("/api/statistics?type=overview"));
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

    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const cards = [
    {
      id: 1,
      icon: getImagePath("/images/info-img-1.png"),
      label: text("工件总数(个)", "Total Workpieces"),
      value: stats.totalCount,
      suffix: "",
    },
    {
      id: 2,
      icon: getImagePath("/images/info-img-2.png"),
      label: text("已检测数(个)", "Tested Count"),
      value: stats.testedCount,
      suffix: "",
    },
    {
      id: 3,
      icon: getImagePath("/images/info-img-3.png"),
      label: text("未检测数(个)", "Untested Count"),
      value: stats.untestedCount,
      suffix: "",
    },
    {
      id: 4,
      icon: getImagePath("/images/info-img-4.png"),
      label: text("完成率(%)", "Completion Rate"),
      value: stats.completionRate,
      suffix: "%",
    },
  ];

  return (
    <Card className="relative overflow-hidden border-border/60 bg-gradient-to-br from-card to-popover">
      <CardContent className="p-5">
        {CORNER_IMAGES.map((item) => (
          <Image
            key={item.src}
            src={getImagePath(item.src)}
            alt=""
            className={`absolute ${item.position} pointer-events-none opacity-60`}
            width={48}
            height={48}
          />
        ))}

        <div className="relative z-10 mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">{text("实时数据", "Real-time Data")}</span>
          <Badge variant="outline" className="ml-auto text-[10px]">
            {loading ? "Syncing..." : "Live"}
          </Badge>
        </div>

        <div className="relative z-10 grid gap-3">
          {cards.map((card) => (
            <div
              key={card.id}
              className="flex items-center gap-3 rounded-xl border border-border/40 bg-card/50 p-3"
            >
              <div className="shrink-0">
                <Image
                  src={card.icon}
                  alt={card.label}
                  width={40}
                  height={40}
                  className="rounded-lg"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className="text-2xl font-black tracking-tight tabular-nums">
                  {loading ? (
                    "..."
                  ) : (
                    <NumberFlow
                      value={card.value}
                      suffix={card.suffix}
                      transformTiming={{ duration: 600, easing: "ease-out" }}
                    />
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
