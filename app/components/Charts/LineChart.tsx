"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts";

type LineDatum = { name: string; value: number } | { time: string; count: number };

interface LineChartProps {
  data: LineDatum[];
  height?: string;
  id?: string;
}

const AXIS_COLOR = "rgba(232,243,255,0.32)";
const LABEL_COLOR = "rgba(166,192,220,0.86)";

export default function LineChart({ data, height = "100%", id }: LineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!chartRef.current) {
      chartRef.current = echarts.init(container);
    }
    const chart = chartRef.current;

    const labels = data.map((item: any) => item.name ?? item.time ?? "");
    const values = data.map((item: any) => item.value ?? item.count ?? 0);

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(5, 23, 45, 0.85)",
        borderWidth: 0,
        textStyle: { color: "#e8f3ff" }
      },
      grid: { left: 56, right: 24, top: 28, bottom: 40 },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: labels,
        axisLine: { lineStyle: { color: AXIS_COLOR } },
        axisTick: { show: false },
        axisLabel: { color: LABEL_COLOR, interval: Math.floor(labels.length / 8) || 0 }
      },
      yAxis: {
        type: "value",
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: LABEL_COLOR },
        splitLine: { lineStyle: { color: "rgba(255,255,255,0.08)" } }
      },
      series: [
        {
          type: "line",
          data: values,
          smooth: true,
          symbol: "circle",
          symbolSize: 6,
          lineStyle: { width: 3, color: "#5bbdf7" },
          itemStyle: { color: "#5bbdf7" },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(91,189,247,0.45)" },
              { offset: 1, color: "rgba(91,189,247,0.05)" }
            ])
          },
          animationDuration: 600
        }
      ]
    };

    chart.setOption(option, true);

    if (!values.length) {
      chart.setOption({
        graphic: {
          type: "text",
          left: "center",
          top: "middle",
          style: { text: "暂无数据", fill: "rgba(166,192,220,0.8)", fontSize: 14 }
        }
      });
    } else {
      chart.setOption({ graphic: [] });
    }

    const resizeHandler = () => chart.resize();
    window.addEventListener("resize", resizeHandler);
    return () => {
      window.removeEventListener("resize", resizeHandler);
    };
  }, [data]);

  useEffect(() => {
    return () => {
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);

  return <div ref={containerRef} id={id} style={{ width: "100%", height }} />;
}
