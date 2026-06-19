"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, ReferenceLine, ResponsiveContainer } from "recharts";

interface Props {
  project: string;
  name: string;
}

interface SparklinePoint {
  latency_ms: number;
}

const MIN_RUNS = 5;

export function SparklineChart({ project, name }: Props) {
  const [data, setData] = useState<{ v: number }[] | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ project });
    params.append("names[]", name);
    fetch(`/api/runs/sparkline?${params}`)
      .then((r) => r.json())
      .then((res: { name: string; data: SparklinePoint[] }[]) => {
        const points = res.find((r) => r.name === name)?.data ?? [];
        setData(points.map((p) => ({ v: p.latency_ms })).reverse());
      })
      .catch(() => setData([]));
  }, [project, name]);

  if (data === null) {
    return <span className="text-xs" style={{ color: "var(--text-secondary)", opacity: 0.4 }}>…</span>;
  }

  if (data.length < MIN_RUNS) {
    return (
      <span className="text-xs" style={{ color: "var(--text-secondary)", opacity: 0.4 }}>
        not enough history
      </span>
    );
  }

  const mean = data.reduce((s, d) => s + d.v, 0) / data.length;

  return (
    <span
      title={`latency last ${data.length} runs (mean ${Math.round(mean)} ms)`}
      style={{ display: "inline-flex", alignItems: "center", width: 100, height: 24 }}
    >
      <ResponsiveContainer width="100%" height={24}>
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <ReferenceLine y={mean} stroke="#4f5ba6" strokeDasharray="2 2" strokeWidth={1} />
          <Line
            type="monotone"
            dataKey="v"
            stroke="#818cf8"
            dot={false}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </span>
  );
}
