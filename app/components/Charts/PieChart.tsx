"use client";

import ReactECharts from "echarts-for-react";

interface PieSlice {
  name: string;
  value: number;
}

interface PieChartProps {
  title: string;
  data: PieSlice[];
  id?: string;
  colors?: string[];
}

export default function PieChart({ title, data, id, colors }: PieChartProps) {
  const total = data.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  const palette = colors ?? ["#5bbdf7", "#51d3c3", "#9ad0f5", "#ffd166", "#a5bde8", "#f08fc0"];
  const option = {
    tooltip: {
      trigger: "item",
      formatter: "{b}<br/>{c}（{d}%）",
      backgroundColor: "rgba(5, 23, 45, 0.85)",
      borderWidth: 0,
      textStyle: { color: "#e8f3ff" }
    },
    color: palette,
    legend: {
      orient: "vertical",
      right: 0,
      top: "middle",
      itemWidth: 10,
      itemHeight: 10,
      icon: "circle",
      textStyle: { color: "#e8f3ff", fontSize: 12 }
    },
    series: [
      {
        name: title,
        type: "pie",
        radius: ["58%", "78%"],
        center: ["38%", "50%"],
        avoidLabelOverlap: true,
        label: {
          show: true,
          formatter: "{b} {d}%",
          color: "#e8f3ff",
          fontSize: 12,
          fontWeight: 500
        },
        labelLine: { length: 12, length2: 10 },
        itemStyle: { borderRadius: 8, borderColor: "#0a1b31", borderWidth: 2 },
        data
      },
      {
        name: "中心",
        type: "pie",
        radius: ["0%", "52%"],
        center: ["38%", "50%"],
        silent: true,
        label: {
          show: true,
          position: "center",
          formatter: () => {
            const qualified = data.find((item) => /合格/.test(item.name));
            if (qualified && total) {
              const percent = Math.round((qualified.value / total) * 100);
              return `{value|${percent}%}\n{label|合格率}`;
            }
            return `{value|${total}}\n{label|总量}`;
          },
          rich: {
            value: { fontSize: 20, fontWeight: 700, color: "#5bbdf7" },
            label: { fontSize: 12, color: "rgba(232,243,255,0.75)", padding: [4, 0, 0, 0] }
          }
        },
        itemStyle: { color: "rgba(255,255,255,0.03)" },
        data: [{ value: 1 }]
      }
    ],
    labelLayout: { hideOverlap: true }
  } as const;

  return (
    <div className="w-full" id={id} style={{ height: 260 }}>
      <ReactECharts option={option} style={{ height: "100%", width: "100%" }} />
    </div>
  );
}
