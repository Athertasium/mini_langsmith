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
    <div
      className="rounded-lg p-4"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
        Latency — recent 50 root spans
      </h3>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2e3250" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10, fill: "#8b8fa8" }}
            axisLine={{ stroke: "#2e3250" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#8b8fa8" }}
            axisLine={{ stroke: "#2e3250" }}
            tickLine={false}
            unit=" ms"
          />
          <Tooltip
            contentStyle={{
              background: "#1a1d27",
              border: "1px solid #2e3250",
              borderRadius: 6,
              color: "#e8eaf6",
              fontSize: 12,
            }}
            formatter={(v) => [`${v} ms`, "Latency"]}
          />
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
