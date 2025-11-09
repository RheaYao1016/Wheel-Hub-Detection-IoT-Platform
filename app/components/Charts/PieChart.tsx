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

const PIE_SAMPLE_SCALE = 3;

export default function PieChart({ title, data, id, colors }: PieChartProps) {
  const palette = colors ?? ["#5bbdf7", "#51d3c3", "#9ad0f5", "#ffd166", "#a5bde8", "#f08fc0"];
  const colorByName = new Map<string, string>();
  data.forEach((item, index) => {
    colorByName.set(item.name, palette[index % palette.length]);
  });

  const scaledData = data.map((item) => {
    const numeric = Number(item.value) || 0;
    return { ...item, value: Math.max(0, Math.round(numeric * PIE_SAMPLE_SCALE)) };
  });

  const total = scaledData.reduce((sum, item) => sum + (Number(item.value) || 0), 0);

  const formatPercent = (value: number) => {
    if (!total) return 0;
    return Math.round((Number(value) / total) * 100);
  };

  const legendItems = scaledData.map((item) => ({
    ...item,
    percent: formatPercent(Number(item.value)),
    color: colorByName.get(item.name) ?? palette[0]
  }));

  const option = {
    tooltip: {
      trigger: "item",
      formatter: "{b}<br/>{c}（{d}%）",
      backgroundColor: "rgba(5, 23, 45, 0.85)",
      borderWidth: 0,
      textStyle: { color: "#e8f3ff" }
    },
    color: palette,
    legend: { show: false },
    series: [
      {
        name: title,
        type: "pie",
        radius: ["44%", "70%"],
        center: ["45%", "52%"],
        minAngle: 3,
        padAngle: 1.5,
        startAngle: 90,
        avoidLabelOverlap: true,
        label: {
          show: true,
          formatter: (params: { name?: string; value?: number | string; percent?: number }) => {
            if (!params.name) return "";
            const percent =
              typeof params.percent === "number" ? Math.round(params.percent) : formatPercent(Number(params.value) || 0);
            const value = typeof params.value === "number" ? params.value : Number(params.value) || 0;
            return `{label|${params.name}}\n{value|${value}}\u2003{percent|${percent}%}`;
          },
          rich: {
            label: { fontSize: 12, color: "rgba(232,243,255,0.86)", lineHeight: 18 },
            value: { fontSize: 14, fontWeight: 600, color: "#ffffff" },
            percent: { fontSize: 13, color: "#5bbdf7", fontWeight: 600 }
          }
        },
        labelLine: { length: 18, length2: 12, smooth: true },
        itemStyle: { borderRadius: 8, borderColor: "#0a1b31", borderWidth: 2 },
        emphasis: { scale: true, scaleSize: 4 },
        data: scaledData
      },
      {
        name: "中心",
        type: "pie",
        radius: ["0%", "40%"],
        center: ["45%", "52%"],
        silent: true,
        label: {
          show: true,
          position: "center",
          formatter: () => {
            const qualified = scaledData.find((item) => /合格/.test(item.name));
            if (qualified && total) {
              const percent = formatPercent(Number(qualified.value));
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
    labelLayout: {
      hideOverlap: true,
      moveOverlap: "shiftY" as const
    }
  } as const;

  return (
    <div className="pie-chart-shell" id={id}>
      <div className="pie-chart-canvas">
        <ReactECharts option={option} style={{ height: "100%", width: "100%" }} />
      </div>
      <ul className="pie-chart-legend">
        {legendItems.map((item) => (
          <li key={item.name}>
            <span className="legend-bullet" style={{ backgroundColor: item.color }} />
            <div className="legend-text">
              <span className="legend-name">{item.name}</span>
              <span className="legend-value">
                {item.value}（{item.percent}%）
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
