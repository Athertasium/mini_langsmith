"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useEffect, useState } from "react";
import type { TrendPoint } from "@/lib/db";

interface Props {
  project?: string;
  initialData?: TrendPoint[];
}

export function LatencyChart({ project, initialData }: Props) {
  const [data, setData] = useState<TrendPoint[]>(initialData ?? []);

  useEffect(() => {
    if (initialData) return;
    const url = project
      ? `/api/runs/trend?project=${project}`
      : "/api/runs/trend";
    fetch(url)
      .then((r) => r.json())
      .then((rows: TrendPoint[]) => setData(rows))
      .catch(() => {});
  }, [project, initialData]);

  if (data.length === 0) return null;

  const formatted = data.map((d) => ({
    ...d,
    bucket: new Date(d.bucket).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));

  return (
    <div
      className="rounded-lg p-4"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <h3
        className="mb-3 text-xs font-semibold uppercase tracking-wide"
        style={{ color: "var(--text-secondary)" }}
      >
        Latency trend — last 7 days (p50 / p95)
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2e3250" />
          <XAxis
            dataKey="bucket"
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
            formatter={(v, name) => [
              `${v} ms`,
              name === "p50" ? "p50 (median)" : "p95",
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "#8b8fa8" }}
            formatter={(v) => (v === "p50" ? "p50 median" : "p95")}
          />
          <Line
            type="monotone"
            dataKey="p50"
            stroke="#6366f1"
            dot={false}
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="p95"
            stroke="#f472b6"
            dot={false}
            strokeWidth={2}
            strokeDasharray="4 2"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
