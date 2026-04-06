"use client";

type RankingDatum = {
  name: string;
  value: number;
};

interface RankingBarChartProps {
  data: RankingDatum[];
  caption?: string;
}

export default function RankingBarChart({ data, caption = "主力规格分布" }: RankingBarChartProps) {
  const sortedData = [...data].sort((left, right) => right.value - left.value);
  const topItem = sortedData[0];
  const total = sortedData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="ranking-chart-shell">
      <div className="ranking-chart-summary">
        <div className="ranking-chart-stat">
          <span>累计样本</span>
          <strong>{total}</strong>
          <em>{caption}</em>
        </div>
        <div className="ranking-chart-stat">
          <span>冠军规格</span>
          <strong>{topItem?.name ?? "--"}</strong>
          <em>{topItem ? `${topItem.value} 件` : "等待数据"}</em>
        </div>
      </div>

      <div className="ranking-chart-list">
        {sortedData.length ? (
          sortedData.map((item, index) => {
            const percent = total ? Math.round((item.value / total) * 100) : 0;
            return (
              <div key={item.name} className="ranking-chart-item">
                <div className="ranking-chart-item-head">
                  <span className="ranking-chart-rank">{String(index + 1).padStart(2, "0")}</span>
                  <div className="ranking-chart-copy">
                    <strong>{item.name}</strong>
                    <span>{item.value} 件</span>
                  </div>
                  <em>{percent}%</em>
                </div>
                <div className="ranking-chart-track">
                  <span style={{ width: `${Math.max(percent, 8)}%` }} />
                </div>
              </div>
            );
          })
        ) : (
          <div className="loading-state">排行数据加载中...</div>
        )}
      </div>
    </div>
  );
}
