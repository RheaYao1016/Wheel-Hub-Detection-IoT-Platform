"use client";

import { useEffect, useState } from "react";
import PieChart from "@/app/components/Charts/PieChart";

export default function SizeDistributionChart() {
  const [data, setData] = useState<Array<{ name: string; value: number }>>([]);

  useEffect(() => {
    fetch("/api/statistics?type=size-dist")
      .then((res) => res.json())
      .then((d) =>
        setData(
          d.map((item: any) => ({ name: item.size, value: item.count }))
        )
      );
  }, []);

  return <PieChart data={data} id="echarts_1" title="尺寸分类" />;
}

