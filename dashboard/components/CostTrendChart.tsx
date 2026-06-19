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
import type { DailyCostPoint } from "@/lib/db";

interface Props {
  project: string;
  from?: string;
  to?: string;
}

const PROJECT_COLORS = ["#6366f1", "#f472b6", "#34d399", "#facc15"];

export function CostTrendChart({ project, from, to }: Props) {
  const [data, setData] = useState<DailyCostPoint[]>([]);
  const [projects, setProjects] = useState<string[]>([]);

  useEffect(() => {
    const qs = new URLSearchParams({ project });
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    fetch(`/api/cost/trend?${qs}`)
      .then((r) => r.json())
      .then((rows: DailyCostPoint[]) => {
        setData(rows);
        setProjects([...new Set(rows.map((r) => r.project))]);
      })
      .catch(() => {});
  }, [project, from, to]);

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
        No cost data for this period.
      </p>
    );
  }

  // Pivot rows into { bucket, [project]: total_cost } for Recharts multi-line
  const bucketMap = new Map<string, Record<string, unknown>>();
  for (const row of data) {
    const label = new Date(row.bucket).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
    if (!bucketMap.has(label)) bucketMap.set(label, { bucket: label });
    bucketMap.get(label)![row.project] = Number(row.total_cost);
  }
  const chartData = [...bucketMap.values()];

  return (
    <div
      className="rounded-lg p-4"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <h3
        className="mb-3 text-xs font-semibold uppercase tracking-wide"
        style={{ color: "var(--text-secondary)" }}
      >
        Daily spend — {project}
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData}>
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
            tickFormatter={(v: number) => `$${v.toFixed(4)}`}
          />
          <Tooltip
            contentStyle={{
              background: "#1a1d27",
              border: "1px solid #2e3250",
              borderRadius: 6,
              color: "#e8eaf6",
              fontSize: 12,
            }}
            formatter={(v) => [`$${Number(v).toFixed(6)}`, "cost"]}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: "#8b8fa8" }} />
          {projects.map((p, i) => (
            <Line
              key={p}
              type="monotone"
              dataKey={p}
              stroke={PROJECT_COLORS[i % PROJECT_COLORS.length]}
              dot={false}
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
