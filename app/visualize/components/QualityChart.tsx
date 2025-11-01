"use client";

import { useEffect, useState } from "react";
import PieChart from "@/app/components/Charts/PieChart";

export default function QualityChart() {
  const [data, setData] = useState<Array<{ name: string; value: number }>>([]);

  useEffect(() => {
    fetch("/api/statistics?type=quality")
      .then((res) => res.json())
      .then((d) =>
        setData([
          { name: "合格", value: d.qualified },
          { name: "不合格", value: d.unqualified },
        ])
      );
  }, []);

  return (
    <PieChart
      data={data}
      id="echarts_4"
      title="合格率"
      colors={["#0089ff", "#f36f8a"]}
    />
  );
}

