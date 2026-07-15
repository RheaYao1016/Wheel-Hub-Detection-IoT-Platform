"use client";

import { useEffect, useState } from "react";
import LineChart from "@/app/components/Charts/LineChart";
import { getApiPath } from "@/lib/api-path";

export default function DailyChart() {
  const [data, setData] = useState<Array<{ time: string; count: number }>>(
    []
  );

  useEffect(() => {
    fetch(getApiPath("/api/statistics?type=daily"))
      .then((res) => res.json())
      .then(setData);
  }, []);

  return <LineChart data={data} id="echarts_3" />;
}

