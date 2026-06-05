"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import * as echarts from "echarts";
import { DEFAULT_CHART_THEME_TOKENS, type ChartThemeTokens, readChartThemeTokens } from "@/lib/theme";

type LineDatum = { name: string; value: number } | { time: string; count: number };

interface LineChartProps {
  data: LineDatum[];
  height?: string;
  id?: string;
  showArea?: boolean;
}

export default function LineChart({
  data,
  height = "320px",
  id,
  showArea = true,
}: LineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const [tokens, setTokens] = useState<ChartThemeTokens>(DEFAULT_CHART_THEME_TOKENS);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncTokens = () => setTokens(readChartThemeTokens());
    syncTokens();

    const observer = new MutationObserver(syncTokens);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "style"],
    });

    const timer = requestAnimationFrame(() => setIsReady(true));

    return () => {
      observer.disconnect();
      cancelAnimationFrame(timer);
    };
  }, []);

  const chartData = useMemo(() => {
    const labels = data.map((item) => ("name" in item ? item.name : item.time));
    const values = data.map((item) => ("value" in item ? item.value : item.count));
    const lastValue = values.at(-1) ?? 0;
    const peakValue = values.length ? Math.max(...values) : 0;
    const averageValue = values.length
      ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
      : 0;
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

  const buildOption = useCallback(
    (): echarts.EChartsOption => {
      const axisColor = `${tokens.textSecondary}40`;
      const splitLineColor = `${tokens.textSecondary}15`;
      const latestIndex = chartData.values.length ? chartData.values.length - 1 : 0;

      return {
        animationDuration: 1000,
        animationEasing: "cubicInOut" as const,
        tooltip: {
          trigger: "axis" as const,
          backgroundColor: tokens.panelBgStrong,
          borderColor: tokens.ringSoft,
          borderWidth: 1,
          textStyle: { color: tokens.textPrimary, fontSize: 13 },
          axisPointer: {
            type: "line" as const,
            lineStyle: {
              color: tokens.accentStrong,
              width: 1.5,
              type: "solid" as const,
            },
          },
          extraCssText:
            "backdrop-filter: blur(14px); border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.3); padding: 10px 14px;",
          padding: [10, 14],
          formatter: (params: any) => {
            if (!params || params.length === 0) return "";
            const item = params[0];
            return `<div style="font-weight:600;margin-bottom:4px">${item.axisValue}</div>
                    <div style="font-size:14px">${item.seriesName}: <strong>${item.value}</strong></div>`;
          },
        },
        grid: {
          left: 50,
          right: 30,
          top: 30,
          bottom: 36,
          containLabel: false,
        },
        xAxis: {
          type: "category" as const,
          boundaryGap: false,
          data: chartData.labels,
          axisLine: { lineStyle: { color: axisColor } },
          axisTick: { show: false },
          axisLabel: {
            color: tokens.textSecondary,
            fontSize: 11,
            interval: Math.max(0, Math.floor(chartData.labels.length / 10)),
            margin: 14,
            rotate: chartData.labels.length > 15 ? 30 : 0,
          },
          splitLine: { show: false },
        },
        yAxis: {
          type: "value" as const,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: {
            color: tokens.textSecondary,
            fontSize: 11,
            margin: 12,
          },
          splitLine: {
            lineStyle: {
              color: splitLineColor,
              type: "dashed" as const,
            },
          },
          scale: true,
        },
        series: [
          {
            type: "line" as const,
            name: "检测量",
            data: chartData.values,
            smooth: 0.4,
            showSymbol: false,
            lineStyle: {
              width: 3,
              color: tokens.accent,
              shadowBlur: 15,
              shadowColor: `${tokens.accent}40`,
            },
            areaStyle: showArea
              ? {
                  color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: `${tokens.accent}55` },
                    { offset: 0.5, color: `${tokens.accent}25` },
                    { offset: 1, color: `${tokens.accent}08` },
                  ]),
                }
              : undefined,
            markPoint: chartData.values.length
              ? {
                  symbol: "circle",
                  symbolSize: 12,
                  data: [
                    {
                      name: "latest",
                      coord: [
                        chartData.labels[latestIndex],
                        chartData.values[latestIndex],
                      ],
                      value: "",
                      itemStyle: {
                        color: tokens.accentStrong,
                        shadowBlur: 10,
                        shadowColor: `${tokens.accentStrong}60`,
                      },
                      label: {
                        show: true,
                        formatter: `${chartData.values[latestIndex]}`,
                        position: "top" as const,
                        color: tokens.textPrimary,
                        fontWeight: 700,
                        fontSize: 12,
                        offset: [0, -8],
                      },
                    },
                  ],
                }
              : undefined,
            markLine: chartData.values.length
              ? {
                  silent: true,
                  symbol: "none",
                  lineStyle: {
                    color: `${tokens.accentWarm}60`,
                    type: "dashed" as const,
                    width: 1.5,
                  },
                  label: {
                    color: tokens.textSecondary,
                    formatter: `均值 ${chartData.averageValue}`,
                    fontSize: 11,
                  },
                  data: [{ yAxis: chartData.averageValue }],
                }
              : undefined,
          },
        ],
      };
    },
    [chartData, tokens, showArea],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isReady) return;

    if (!chartRef.current) {
      chartRef.current = echarts.init(container, undefined, {
        renderer: "canvas",
        devicePixelRatio: 2,
      });
    }

    const chart = chartRef.current;
    const option = buildOption();
    chart.setOption(option, true);

    const resizeHandler = () => chart.resize();
    window.addEventListener("resize", resizeHandler);

    // Mobile: observe container size changes for responsive charts
    if (typeof ResizeObserver !== "undefined") {
      const resizeObserver = new ResizeObserver(() => {
        chart.resize();
      });
      resizeObserver.observe(container);

      return () => {
        window.removeEventListener("resize", resizeHandler);
        resizeObserver.disconnect();
      };
    }

    return () => {
      window.removeEventListener("resize", resizeHandler);
    };
  }, [chartData, tokens, isReady, buildOption]);

  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.dispose();
        chartRef.current = null;
      }
    };
  }, []);

  const deltaColor = chartData.deltaValue >= 0 ? "metric-positive" : "metric-warning";
  const deltaPrefix = chartData.deltaValue >= 0 ? "+" : "";

  if (!isReady || data.length === 0) {
    return (
      <div
        className="chart-loading-skeleton"
        style={{ height, display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <div className="skeleton-pulse" />
      </div>
    );
  }

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
          <strong className={deltaColor}>
            {deltaPrefix}
            {chartData.deltaValue}
          </strong>
        </div>
      </div>
      <div
        ref={containerRef}
        id={id}
        className="line-chart-canvas"
        style={{ width: "100%", height }}
      />
    </div>
  );
}
