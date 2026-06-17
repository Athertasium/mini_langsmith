"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Run } from "@/lib/db";

interface DataPoint {
  time: string;
  latency_ms: number;
}

export function LatencyChart({ runs }: { runs: Run[] }) {
  const data: DataPoint[] = runs
    .filter((r) => r.latency_ms != null)
    .map((r) => ({
      time: new Date(r.start_time).toLocaleTimeString(),
      latency_ms: r.latency_ms!,
    }))
    .slice(-50);

  if (data.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-medium text-gray-600">
        Latency (recent 50 root spans)
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="time" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} unit=" ms" />
          <Tooltip formatter={(v) => [`${v} ms`, "Latency"]} />
          <Line
            type="monotone"
            dataKey="latency_ms"
            stroke="#6366f1"
            dot={false}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
