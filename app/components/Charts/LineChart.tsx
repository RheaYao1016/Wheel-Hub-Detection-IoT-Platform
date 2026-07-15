"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "../ui/Badge";
import {
  DEFAULT_CHART_THEME_TOKENS,
  type ChartThemeTokens,
  colorWithAlpha,
  readChartThemeTokens,
} from "@/lib/theme";
import { cn } from "@/lib/utils";

type LineDatum =
  | { name: string; value: number }
  | { time: string; count: number };

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
            shadowColor: colorWithAlpha(tokens.accent, 0.4),
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: colorWithAlpha(tokens.accent, 0.4) },
              { offset: 0.45, color: colorWithAlpha(tokens.accentStrong, 0.15) },
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
              color: colorWithAlpha(tokens.accentWarm, 0.53),
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

  const trendVariant =
    chartData.deltaValue > 0 ? "success" : chartData.deltaValue < 0 ? "destructive" : "secondary";
  const TrendIcon =
    chartData.deltaValue > 0 ? TrendingUp : chartData.deltaValue < 0 ? TrendingDown : Minus;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-border bg-card/50 p-2 text-center">
          <div className="text-xs text-muted-foreground">最新值</div>
          <div className="text-xl font-black text-foreground">
            {chartData.lastValue}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card/50 p-2 text-center">
          <div className="text-xs text-muted-foreground">峰值</div>
          <div className="text-xl font-black text-primary">
            {chartData.peakValue}
          </div>
        </div>
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card/50 p-2 text-center">
          <div className="text-xs text-muted-foreground">波动</div>
          <Badge variant={trendVariant} className="mt-0.5 text-[10px]">
            <TrendIcon className="mr-1 h-3 w-3" />
            {chartData.deltaValue >= 0 ? "+" : ""}
            {chartData.deltaValue}
          </Badge>
        </div>
      </div>

      <div
        ref={containerRef}
        id={id}
        className={cn("w-full flex-1", height === "100%" && "h-full min-h-[200px]")}
        style={{ height, width: "100%" }}
      />
    </div>
  );
}
