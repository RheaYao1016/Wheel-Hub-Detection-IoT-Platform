"use client";

import { useEffect, useMemo, useState } from "react";
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
}

export default function PieChart({ title, data, id, colors }: PieChartProps) {
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

  const palette = colors ?? tokens.palette;
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

  const total = normalizedData.reduce((sum, item) => sum + item.value, 0);
  const primaryItem = normalizedData[0];
  const qualifiedItem = normalizedData.find((item) => /合格/.test(item.name));

  const formatPercent = (value: number) => {
    if (!total) return 0;
    return Math.round((value / total) * 100);
  };

  const centerValue = qualifiedItem ? `${formatPercent(qualifiedItem.value)}%` : `${total}`;
  const centerLabel = qualifiedItem ? "合格率" : "样本总量";
  const centerSubLabel = primaryItem ? `主类 ${primaryItem.name}` : "等待数据";
  const highlightValue = qualifiedItem ? `${formatPercent(qualifiedItem.value)}%` : `${primaryItem ? formatPercent(primaryItem.value) : 0}%`;
  const highlightLabel = qualifiedItem ? "优品占比" : "主类占比";

  const legendItems = normalizedData.map((item, index) => ({
    ...item,
    rank: String(index + 1).padStart(2, "0"),
    percent: formatPercent(item.value),
    color: palette[index % palette.length],
  }));

  const option = {
    animationDuration: 900,
    animationEasing: "cubicOut",
    tooltip: {
      trigger: "item",
      formatter: ({ name, value }: { name: string; value: number }) => `${name}<br/>${value} 件 (${formatPercent(value)}%)`,
      backgroundColor: tokens.panelBgStrong,
      borderColor: tokens.ringSoft,
      borderWidth: 1,
      textStyle: { color: tokens.textPrimary },
      extraCssText: "backdrop-filter: blur(14px); border-radius: 16px;",
    },
    color: palette,
    series: [
      {
        name: title,
        type: "pie",
        radius: ["52%", "72%"],
        center: ["34%", "50%"],
        startAngle: 110,
        minAngle: 3,
        avoidLabelOverlap: true,
        label: { show: false },
        labelLine: { show: false },
        itemStyle: {
          borderRadius: 18,
          borderColor: tokens.panelBgStrong,
          borderWidth: 5,
          shadowBlur: 18,
          shadowColor: "rgba(0,0,0,0.18)",
        },
        emphasis: {
          scale: true,
          scaleSize: 6,
        },
        data: normalizedData,
      },
      {
        name: "halo",
        type: "pie",
        radius: ["42%", "46%"],
        center: ["34%", "50%"],
        silent: true,
        label: { show: false },
        data: [{ value: 100, itemStyle: { color: "rgba(255,255,255,0.06)" } }],
      },
      {
        name: "core",
        type: "pie",
        radius: ["0%", "34%"],
        center: ["34%", "50%"],
        silent: true,
        label: {
          show: true,
          position: "center",
          formatter: () => `{value|${centerValue}}\n{label|${centerLabel}}\n{sub|${centerSubLabel}}`,
          rich: {
            value: {
              fontSize: 26,
              fontWeight: 800,
              lineHeight: 32,
              color: tokens.accent,
            },
            label: {
              fontSize: 12,
              fontWeight: 600,
              lineHeight: 18,
              color: tokens.textPrimary,
            },
            sub: {
              fontSize: 11,
              lineHeight: 16,
              color: tokens.textSecondary,
            },
          },
        },
        itemStyle: { color: "rgba(255,255,255,0.03)" },
        data: [{ value: 100 }],
      },
    ],
  } as const;

  return (
    <div className="pie-chart-shell" id={id}>
      <div className="pie-chart-canvas">
        <ReactECharts option={option} style={{ height: "100%", width: "100%" }} />
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
            <em>{qualifiedItem?.name ?? primaryItem?.name ?? "暂无主类"}</em>
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
                  <span style={{ width: `${Math.max(item.percent, 6)}%`, background: item.color }} />
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
