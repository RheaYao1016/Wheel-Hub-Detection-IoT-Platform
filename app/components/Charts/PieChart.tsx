"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import ReactECharts from "echarts-for-react";
import { DEFAULT_CHART_THEME_TOKENS, type ChartThemeTokens, readChartThemeTokens } from "@/lib/theme";

interface PieSlice {
  name: string;
  value: number;
}

interface PieChartProps {
  title: string;
  data: PieSlice[];
  id?: string;
  colors?: string[];
  height?: string;
}

export default function PieChart({ title, data, id, colors, height = "320px" }: PieChartProps) {
  const [tokens, setTokens] = useState<ChartThemeTokens>(DEFAULT_CHART_THEME_TOKENS);
  const [isReady, setIsReady] = useState(false);
  const chartRef = useRef<ReactECharts>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncTokens = () => setTokens(readChartThemeTokens());
    syncTokens();

    const observer = new MutationObserver(syncTokens);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "style"],
    });

    // 延迟设置ready状态，触发入场动画
    const timer = requestAnimationFrame(() => setIsReady(true));

    return () => {
      observer.disconnect();
      cancelAnimationFrame(timer);
    };
  }, []);

  const palette = useMemo(() => colors ?? tokens.palette, [colors, tokens.palette]);

  const normalizedData = useMemo(
    () =>
      data
        .map((item) => ({
          name: item.name,
          value: Math.max(0, Number(item.value) || 0),
        }))
        .sort((left, right) => right.value - left.value),
    [data],
  );

  const total = useMemo(
    () => normalizedData.reduce((sum, item) => sum + item.value, 0),
    [normalizedData],
  );

  const qualifiedItem = useMemo(
    () => normalizedData.find((item) => /合格/.test(item.name)),
    [normalizedData],
  );

  const formatPercent = useCallback(
    (value: number) => {
      if (!total) return "0";
      return ((value / total) * 100).toFixed(1);
    },
    [total],
  );

  const centerValue = useMemo(
    () => (qualifiedItem ? `${formatPercent(qualifiedItem.value)}%` : `${total}`),
    [qualifiedItem, formatPercent, total],
  );

  const centerLabel = qualifiedItem ? "合格率" : "样本总量";
  const centerSubLabel = normalizedData[0]
    ? `主类 ${normalizedData[0].name}`
    : "等待数据";

  const highlightValue = useMemo(
    () =>
      qualifiedItem
        ? `${formatPercent(qualifiedItem.value)}%`
        : normalizedData[0]
          ? `${formatPercent(normalizedData[0].value)}%`
          : "0%",
    [qualifiedItem, normalizedData, formatPercent],
  );

  const highlightLabel = qualifiedItem ? "优品占比" : "主类占比";

  const legendItems = useMemo(
    () =>
      normalizedData.map((item, index) => ({
        ...item,
        rank: String(index + 1).padStart(2, "0"),
        percent: formatPercent(item.value),
        color: palette[index % palette.length],
      })),
    [normalizedData, palette, formatPercent],
  );

  const option = useMemo(
    () => ({
      animationDuration: 1200,
      animationEasing: "cubicInOut" as const,
      animationDelay: (idx: number) => idx * 100,
      tooltip: {
        trigger: "item" as const,
        formatter: ({ name, value }: { name: string; value: number }) =>
          `<div style="font-weight:600;margin-bottom:4px">${name}</div><div style="font-size:14px">${value} 件 (${formatPercent(value)}%)</div>`,
        backgroundColor: tokens.panelBgStrong,
        borderColor: tokens.ringSoft,
        borderWidth: 1,
        textStyle: { color: tokens.textPrimary, fontSize: 13 },
        extraCssText:
          "backdrop-filter: blur(14px); border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.3); padding: 10px 14px;",
        padding: [10, 14],
      },
      color: palette,
      series: [
        {
          name: title,
          type: "pie" as const,
          radius: ["54%", "74%"],
          center: ["34%", "50%"],
          startAngle: 90,
          minAngle: 5,
          avoidLabelOverlap: true,
          label: { show: false },
          labelLine: { show: false },
          itemStyle: {
            borderRadius: 14,
            borderColor: tokens.panelBgStrong,
            borderWidth: 4,
            shadowBlur: 20,
            shadowColor: `${tokens.accent}30`,
          },
          emphasis: {
            scale: true,
            scaleSize: 8,
            itemStyle: {
              shadowBlur: 30,
              shadowColor: `${tokens.accent}50`,
            },
          },
          data: normalizedData,
        },
        {
          name: "halo",
          type: "pie" as const,
          radius: ["44%", "48%"],
          center: ["34%", "50%"],
          silent: true,
          label: { show: false },
          data: [
            {
              value: 100,
              itemStyle: { color: `${tokens.ringSoft}40` },
            },
          ],
        },
        {
          name: "core",
          type: "pie" as const,
          radius: ["0%", "36%"],
          center: ["34%", "50%"],
          silent: true,
          label: {
            show: true,
            position: "center" as const,
            formatter: () =>
              `{value|${centerValue}}\n{label|${centerLabel}}\n{sub|${centerSubLabel}}`,
            rich: {
              value: {
                fontSize: 28,
                fontWeight: 800,
                lineHeight: 36,
                color: tokens.accent,
                fontFamily:
                  "'SF Pro Display', 'Inter', -apple-system, sans-serif",
              },
              label: {
                fontSize: 12,
                fontWeight: 600,
                lineHeight: 20,
                color: tokens.textPrimary,
                letterSpacing: 1,
              },
              sub: {
                fontSize: 11,
                lineHeight: 18,
                color: tokens.textSecondary,
                fontStyle: "italic" as const,
              },
            },
          },
          itemStyle: { color: `${tokens.panelBg}60` },
          data: [{ value: 100 }],
        },
      ],
    }),
    [
      title,
      normalizedData,
      palette,
      tokens,
      centerValue,
      centerLabel,
      centerSubLabel,
      formatPercent,
    ],
  );

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
    <div className="pie-chart-shell" id={id} style={{ height }}>
      <div className="pie-chart-canvas" style={{ height: "100%" }}>
        <ReactECharts
          ref={chartRef}
          option={option}
          style={{ height: "100%", width: "100%" }}
          opts={{ renderer: "canvas", devicePixelRatio: 2 }}
        />
      </div>
      <div className="pie-chart-side">
        <div className="pie-chart-summary">
          <div className="pie-summary-card">
            <span>总量</span>
            <strong>{total}</strong>
            <em>当前结构样本</em>
          </div>
          <div className="pie-summary-card">
            <span>{highlightLabel}</span>
            <strong>{highlightValue}</strong>
            <em>{qualifiedItem?.name ?? normalizedData[0]?.name ?? "暂无主类"}</em>
          </div>
        </div>
        <ul className="pie-chart-legend">
          {legendItems.map((item) => (
            <li key={item.name} className="pie-legend-item">
              <span className="legend-rank" style={{ color: item.color }}>
                {item.rank}
              </span>
              <div className="legend-main">
                <div className="legend-row">
                  <span className="legend-name">{item.name}</span>
                  <span className="legend-value">{item.value} 件</span>
                </div>
                <div className="legend-progress">
                  <span
                    style={{
                      width: `${Math.max(Number(item.percent), 6)}%`,
                      background: item.color,
                    }}
                  />
                </div>
                <div className="legend-row legend-row-muted">
                  <span>占比</span>
                  <span>{item.percent}%</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
