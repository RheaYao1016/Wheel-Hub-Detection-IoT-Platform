"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts";
import { DEFAULT_CHART_THEME_TOKENS, type ChartThemeTokens, readChartThemeTokens } from "@/lib/theme";

type LineDatum = { name: string; value: number } | { time: string; count: number };

interface LineChartProps {
  data: LineDatum[];
  height?: string;
  id?: string;
}

export default function LineChart({ data, height = "100%", id }: LineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const [tokens, setTokens] = useState<ChartThemeTokens>(DEFAULT_CHART_THEME_TOKENS);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncTokens = () => setTokens(readChartThemeTokens());
    syncTokens();

    const observer = new MutationObserver(syncTokens);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "style"],
    });

    return () => observer.disconnect();
  }, []);

  const chartData = useMemo(() => {
    const labels = data.map((item) => ("name" in item ? item.name : item.time));
    const values = data.map((item) => ("value" in item ? item.value : item.count));
    const lastValue = values.at(-1) ?? 0;
    const peakValue = values.length ? Math.max(...values) : 0;
    const averageValue = values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
    const deltaValue = values.length > 1 ? lastValue - values[values.length - 2] : 0;

    return {
      labels,
      values,
      lastValue,
      peakValue,
      averageValue,
      deltaValue,
    };
  }, [data]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!chartRef.current) {
      chartRef.current = echarts.init(container);
    }

    const chart = chartRef.current;
    const axisColor = `${tokens.textSecondary}55`;
    const splitLineColor = `${tokens.textSecondary}22`;
    const latestIndex = chartData.values.length ? chartData.values.length - 1 : 0;

    const option: echarts.EChartsOption = {
      animationDuration: 900,
      animationEasing: "cubicOut",
      tooltip: {
        trigger: "axis",
        backgroundColor: tokens.panelBgStrong,
        borderColor: tokens.ringSoft,
        borderWidth: 1,
        textStyle: { color: tokens.textPrimary },
        axisPointer: {
          type: "line",
          lineStyle: {
            color: tokens.accentStrong,
            width: 1.5,
          },
        },
      },
      grid: { left: 46, right: 24, top: 24, bottom: 30 },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: chartData.labels,
        axisLine: { lineStyle: { color: axisColor } },
        axisTick: { show: false },
        axisLabel: {
          color: tokens.textSecondary,
          interval: Math.floor(chartData.labels.length / 8) || 0,
          margin: 14,
        },
      },
      yAxis: {
        type: "value",
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: tokens.textSecondary,
          margin: 12,
        },
        splitLine: {
          lineStyle: {
            color: splitLineColor,
            type: "dashed",
          },
        },
      },
      series: [
        {
          type: "line",
          data: chartData.values,
          smooth: 0.35,
          showSymbol: false,
          lineStyle: {
            width: 3,
            color: tokens.accent,
            shadowBlur: 18,
            shadowColor: `${tokens.accent}66`,
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: `${tokens.accent}66` },
              { offset: 0.45, color: `${tokens.accentStrong}26` },
              { offset: 1, color: "rgba(255,255,255,0.02)" },
            ]),
          },
          markPoint: {
            symbol: "circle",
            symbolSize: 14,
            data: chartData.values.length
              ? [
                  {
                    name: "latest",
                    coord: [chartData.labels[latestIndex], chartData.values[latestIndex]],
                    value: chartData.values[latestIndex],
                    itemStyle: { color: tokens.accentStrong },
                    label: {
                      show: true,
                      formatter: `${chartData.values[latestIndex]}`,
                      position: "top",
                      color: tokens.textPrimary,
                      fontWeight: 700,
                    },
                  },
                ]
              : [],
          },
          markLine: {
            silent: true,
            symbol: "none",
            lineStyle: {
              color: `${tokens.accentWarm}88`,
              type: "dashed",
            },
            label: {
              color: tokens.textSecondary,
              formatter: `均值 ${chartData.averageValue}`,
            },
            data: chartData.values.length ? [{ yAxis: chartData.averageValue }] : [],
          },
        },
      ],
    };

    chart.setOption(option, true);

    if (!chartData.values.length) {
      chart.setOption({
        graphic: {
          type: "text",
          left: "center",
          top: "middle",
          style: { text: "暂无数据", fill: tokens.textSecondary, fontSize: 14 },
        },
      });
    } else {
      chart.setOption({ graphic: [] });
    }

    const resizeHandler = () => chart.resize();
    window.addEventListener("resize", resizeHandler);

    return () => {
      window.removeEventListener("resize", resizeHandler);
    };
  }, [chartData, tokens]);

  useEffect(() => {
    return () => {
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);

  return (
    <div className="line-chart-shell">
      <div className="line-chart-meta">
        <div className="line-chart-metric">
          <span>最新值</span>
          <strong>{chartData.lastValue}</strong>
        </div>
        <div className="line-chart-metric">
          <span>峰值</span>
          <strong>{chartData.peakValue}</strong>
        </div>
        <div className="line-chart-metric">
          <span>波动</span>
          <strong className={chartData.deltaValue >= 0 ? "metric-positive" : "metric-warning"}>
            {chartData.deltaValue >= 0 ? "+" : ""}
            {chartData.deltaValue}
          </strong>
        </div>
      </div>
      <div ref={containerRef} id={id} className="line-chart-canvas" style={{ width: "100%", height }} />
    </div>
  );
}
