"use client";

import { useEffect, useState } from "react";
import LineChart from "@/app/components/Charts/LineChart";

export default function DailyChart() {
  const [data, setData] = useState<Array<{ time: string; count: number }>>(
    []
  );

  useEffect(() => {
    fetch("/api/statistics?type=daily")
      .then((res) => res.json())
      .then(setData);
  }, []);

  return <LineChart data={data} id="echarts_3" />;
}

