"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts";

interface LineChartDatumA { time: string; count: number }
interface LineChartDatumB { name: string; value: number }
type LineData = Array<LineChartDatumA | LineChartDatumB>

interface LineChartProps {
  data: LineData;
  id?: string;
  height?: string;
}

export default function LineChart({ data, id, height = "100%" }: LineChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const xData = data.map((item: any) => (item.time ?? item.name ?? ""));
    const yData = data.map((item: any) => (item.count ?? item.value ?? 0));

    const option: echarts.EChartsOption = {
      tooltip: { trigger: "axis", axisPointer: { type: 'cross' } },
      grid: {
        left: "3%",
        right: "3%",
        top: "8%",
        bottom: "5%",
        containLabel: true,
      },
      color: ["#25f3e6"],
      xAxis: [
        {
          type: "category",
          axisTick: { show: false },
          boundaryGap: false,
          axisLabel: {
            textStyle: {
              color: "#ccc",
              fontSize: "12",
            },
            rotate: 50,
            formatter: (params: string) => {
              if (params.length > 4) {
                return params.substring(0, 4) + "...";
              }
              return params;
            },
          },
          data: xData,
        },
      ],
      yAxis: {
        type: "value",
        axisLabel: {
          textStyle: {
            color: "#ccc",
            fontSize: "12",
          },
        },
        axisLine: {
          lineStyle: {
            color: "rgba(160,160,160,0.3)",
          },
        },
        splitLine: {
          lineStyle: {
            color: "rgba(160,160,160,0.3)",
          },
        },
      },
      series: [
        {
          type: "line",
          showSymbol: true,
          symbolSize: 4,
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              {
                offset: 0,
                color: "#25f3e6",
              },
              {
                offset: 1,
                color: "#0089ff",
              },
            ]),
          },
          smooth: true,
          data: yData,
          animationDuration: 500,
        },
      ],
    };

    chartInstance.current.setOption(option);

    const handleResize = () => {
      chartInstance.current?.resize();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
    // 空状态
    if (yData.length === 0) {
      chartInstance.current.setOption({
        graphic: [{
          type: 'text', left: 'center', top: 'middle', style: { text: '— 暂无数据 —', fill: '#9fb6d3', fontSize: 14 }
        }]
      });
    } else {
      chartInstance.current.setOption({ graphic: [] });
    }

  }, [data, id]);

  return <div ref={chartRef} id={id} style={{ width: "100%", height }} />;
}

