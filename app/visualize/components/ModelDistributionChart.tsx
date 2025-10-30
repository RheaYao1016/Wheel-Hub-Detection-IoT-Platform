"use client";

import { useEffect, useState } from "react";
import PieChart from "@/app/components/Charts/PieChart";

export default function ModelDistributionChart() {
  const [data, setData] = useState<Array<{ name: string; value: number }>>([]);

  useEffect(() => {
    fetch("/api/statistics?type=model-dist")
      .then((res) => res.json())
      .then((d) =>
        setData(
          d.map((item: any) => ({ name: item.model, value: item.count }))
        )
      );
  }, []);

  return (
    <PieChart
      data={data}
      id="echarts_2"
      title="型号分类"
      colors={["#f845f1", "#ad46f3", "#5045f6", "#4777f5", "#44aff0"]}
    />
  );
}

