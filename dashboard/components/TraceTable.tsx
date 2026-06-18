"use client";

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Run } from "@/lib/db";

const col = createColumnHelper<Run>();

function costUsd(run: Run): string {
  const cost = (run.extra as Record<string, unknown> | null)?.cost_usd;
  if (cost == null) return "—";
  return `$${Number(cost).toFixed(4)}`;
}

const RUN_TYPE_STYLES: Record<string, { bg: string; color: string }> = {
  llm:       { bg: "#1e2a4a", color: "#818cf8" },
  chain:     { bg: "#2a1e4a", color: "#c084fc" },
  tool:      { bg: "#2a2a1e", color: "#facc15" },
  retriever: { bg: "#1e2a2a", color: "#34d399" },
};

const columns = [
  col.accessor("name", { header: "Name" }),
  col.accessor("project", { header: "Project" }),
  col.accessor("run_type", {
    header: "Type",
    cell: (info) => {
      const v = info.getValue();
      const s = RUN_TYPE_STYLES[v] ?? { bg: "#1e2030", color: "#8b8fa8" };
      return (
        <span
          className="rounded px-2 py-0.5 text-xs font-medium"
          style={{ background: s.bg, color: s.color }}
        >
          {v}
        </span>
      );
    },
  }),
  col.accessor("start_time", {
    header: "Started",
    cell: (info) => {
      const d = new Date(info.getValue());
      return (
        <span style={{ color: "var(--text-secondary)", fontFamily: "var(--font-geist-mono)" }}>
          {d.toISOString().replace("T", " ").slice(0, 19)} UTC
        </span>
      );
    },
  }),
  col.accessor("latency_ms", {
    header: "Latency",
    cell: (info) => {
      const v = info.getValue();
      return v != null ? (
        <span style={{ color: "#818cf8", fontFamily: "var(--font-geist-mono)" }}>{v} ms</span>
      ) : "—";
    },
  }),
  col.display({
    id: "cost",
    header: "Cost",
    cell: (info) => (
      <span style={{ fontFamily: "var(--font-geist-mono)" }}>{costUsd(info.row.original)}</span>
    ),
  }),
  col.accessor("error", {
    header: "Status",
    cell: (info) =>
      info.getValue() ? (
        <span className="rounded px-2 py-0.5 text-xs font-bold" style={{ background: "#3f1515", color: "#f87171" }}>
          ERROR
        </span>
      ) : (
        <span className="rounded px-2 py-0.5 text-xs font-bold" style={{ background: "#0f2a1a", color: "#4ade80" }}>
          OK
        </span>
      ),
  }),
];

export function TraceTable({ data }: { data: Run[] }) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div
      className="overflow-x-auto rounded-lg"
      style={{ border: "1px solid var(--border)" }}
    >
      <table className="min-w-full divide-y text-sm" style={{ borderColor: "var(--border)" }}>
        <thead style={{ background: "var(--surface)" }}>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th
                  key={h.id}
                  className="cursor-pointer select-none px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "var(--text-secondary)" }}
                  onClick={h.column.getToggleSortingHandler()}
                >
                  {flexRender(h.column.columnDef.header, h.getContext())}
                  {h.column.getIsSorted() === "asc"
                    ? " ↑"
                    : h.column.getIsSorted() === "desc"
                      ? " ↓"
                      : ""}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody style={{ background: "var(--surface)" }}>
          {table.getRowModel().rows.map((row, i) => (
            <tr
              key={row.id}
              className="cursor-pointer transition-colors"
              style={{
                borderTop: "1px solid var(--border)",
                background: i % 2 === 0 ? "var(--surface)" : "var(--surface-2)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLTableRowElement).style.background = "var(--surface-2)";
                (e.currentTarget as HTMLTableRowElement).style.borderLeft = "2px solid var(--accent)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLTableRowElement).style.background =
                  i % 2 === 0 ? "var(--surface)" : "var(--surface-2)";
                (e.currentTarget as HTMLTableRowElement).style.borderLeft = "";
              }}
              onClick={() => router.push(`/traces/${row.original.id}`)}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3" style={{ color: "var(--text-primary)" }}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && (
        <p className="py-12 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
          No traces yet.
        </p>
      )}
    </div>
  );
}
