"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SessionCostRow } from "@/lib/db";

interface Props {
  project: string;
  from?: string;
  to?: string;
}

export function SessionCostList({ project, from, to }: Props) {
  const [data, setData] = useState<SessionCostRow[]>([]);

  useEffect(() => {
    const qs = new URLSearchParams({ project });
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    fetch(`/api/cost/sessions?${qs}`)
      .then((r) => r.json())
      .then((rows: SessionCostRow[]) => setData(rows))
      .catch(() => {});
  }, [project, from, to]);

  return (
    <div
      className="overflow-x-auto rounded-lg"
      style={{ border: "1px solid var(--border)" }}
    >
      <div
        className="px-4 py-3 text-xs font-semibold uppercase tracking-wide"
        style={{ background: "var(--surface)", color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}
      >
        Cost by session
      </div>
      <table className="min-w-full text-sm" style={{ background: "var(--surface)" }}>
        <thead>
          <tr>
            {["Session", "Started", "Spans", "Total Cost"].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={row.session_id}
              style={{
                borderTop: "1px solid var(--border)",
                background: i % 2 === 0 ? "var(--surface)" : "var(--surface-2)",
              }}
            >
              <td className="px-4 py-3">
                <Link
                  href={`/traces?session_id=${row.session_id}`}
                  className="font-mono text-xs hover:underline"
                  style={{ color: "var(--accent)" }}
                >
                  {row.session_id.slice(0, 8)}…
                </Link>
              </td>
              <td className="px-4 py-3">
                <span style={{ fontFamily: "var(--font-geist-mono)", fontSize: 12, color: "var(--text-secondary)" }}>
                  {new Date(row.started_at).toISOString().replace("T", " ").slice(0, 16)} UTC
                </span>
              </td>
              <td className="px-4 py-3">
                <span style={{ fontFamily: "var(--font-geist-mono)", color: "var(--text-secondary)" }}>
                  {row.span_count}
                </span>
              </td>
              <td className="px-4 py-3">
                <span style={{ fontFamily: "var(--font-geist-mono)", color: "#6366f1", fontWeight: 600 }}>
                  {Number(row.total_cost) === 0 ? "—" : `$${Number(row.total_cost).toFixed(6)}`}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && (
        <p className="py-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
          No sessions with cost data.
        </p>
      )}
    </div>
  );
}
