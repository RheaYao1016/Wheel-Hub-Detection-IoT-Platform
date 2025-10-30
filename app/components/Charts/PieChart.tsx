"use client";
import React from 'react';
import ReactECharts from 'echarts-for-react';

interface PieChartProps {
  title: string;
  data: { name: string; value: number }[];
}

export default function PieChart({ title, data }: PieChartProps) {
  const total = data.reduce((s, i) => s + (Number(i.value) || 0), 0);
  const percent = (v: number) => (total ? Math.round((v / total) * 100) : 0);

  const option = {
    backgroundColor: 'rgba(0,0,0,0)',
    tooltip: { trigger: 'item', formatter: '{b}<br/>{c}（{d}%）' },
    color: ['#5BBDF7', '#51D3C3', '#A5B4FC', '#FFD166', '#1EC997', '#FF9AA2'],
    legend: {
      orient: 'vertical',
      right: 0,
      top: 'middle',
      itemGap: 10,
      itemWidth: 10,
      itemHeight: 10,
      icon: 'circle',
      textStyle: { color: '#e0e7ef', fontSize: 12 }
    },
    series: [
      {
        name: title,
        type: 'pie',
        radius: ['60%', '78%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: true,
        minAngle: 3,
        label: {
          show: true,
          position: 'outside',
          formatter: (p: any) => `${p.name} ${p.percent}%`,
          color: '#e6edf6',
          fontSize: 12,
          fontWeight: 600
        },
        labelLine: { length: 12, length2: 10 },
        itemStyle: { borderRadius: 8, borderColor: '#0f1f35', borderWidth: 2 },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,.4)' } },
        data
      },
      // 中心读数
      {
        name: '中心',
        type: 'pie',
        radius: ['0%', '52%'],
        center: ['35%', '50%'],
        silent: true,
        label: {
          show: true,
          position: 'center',
          formatter: () => {
            // 若有“合格/不合格”二分类，显示合格率；否则显示总量
            const okItem = data.find(d => /合格/.test(d.name));
            if (okItem) return `{val|${percent(okItem.value)}%}\n{sub|合格率}`;
            return `{val|${total}}\n{sub|总量}`;
          },
          rich: {
            val: { fontSize: 20, fontWeight: 800, color: '#5BBDF7' },
            sub: { fontSize: 12, color: '#a8c3de', padding: [4, 0, 0, 0] }
          }
        },
        itemStyle: { color: 'rgba(255,255,255,0.03)' },
        data: [{ value: 1 }]
      }
    ],
    labelLayout: { hideOverlap: true }
  } as any;

  return (
    <div className="w-full h-[240px] md:h-[260px]">
      <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
    </div>
  );
}

