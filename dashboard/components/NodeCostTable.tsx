"use client";

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { useEffect, useState } from "react";
import type { NodeCostRow } from "@/lib/db";

const RUN_TYPE_STYLES: Record<string, { bg: string; color: string }> = {
  llm:       { bg: "#1e2a4a", color: "#818cf8" },
  chain:     { bg: "#2a1e4a", color: "#c084fc" },
  tool:      { bg: "#2a2a1e", color: "#facc15" },
  retriever: { bg: "#1e2a2a", color: "#34d399" },
};

const col = createColumnHelper<NodeCostRow>();

const columns = [
  col.accessor("name", { header: "Node" }),
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
  col.accessor("call_count", {
    header: "Calls",
    cell: (info) => (
      <span style={{ fontFamily: "var(--font-geist-mono)", color: "var(--text-secondary)" }}>
        {info.getValue()}
      </span>
    ),
  }),
  col.accessor("avg_cost", {
    header: "Avg Cost",
    cell: (info) => {
      const v = Number(info.getValue());
      return (
        <span style={{ fontFamily: "var(--font-geist-mono)", color: "#818cf8" }}>
          {v === 0 ? "—" : `$${v.toFixed(6)}`}
        </span>
      );
    },
  }),
  col.accessor("total_cost", {
    header: "Total Cost",
    cell: (info) => {
      const v = Number(info.getValue());
      return (
        <span style={{ fontFamily: "var(--font-geist-mono)", color: "#6366f1", fontWeight: 600 }}>
          {v === 0 ? "—" : `$${v.toFixed(6)}`}
        </span>
      );
    },
  }),
  col.accessor("pct_of_total", {
    header: "% of Total",
    cell: (info) => {
      const pct = Number(info.getValue());
      return (
        <div className="flex items-center gap-2">
          <div
            className="h-1.5 rounded-full"
            style={{
              width: 80,
              background: "var(--surface-2)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ width: `${Math.min(pct, 100)}%`, background: "#6366f1" }}
            />
          </div>
          <span
            style={{
              fontFamily: "var(--font-geist-mono)",
              fontSize: 12,
              color: "var(--text-secondary)",
              minWidth: 36,
            }}
          >
            {pct.toFixed(1)}%
          </span>
        </div>
      );
    },
  }),
];

interface Props {
  project: string;
  from?: string;
  to?: string;
}

export function NodeCostTable({ project, from, to }: Props) {
  const [data, setData] = useState<NodeCostRow[]>([]);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "total_cost", desc: true },
  ]);

  useEffect(() => {
    const qs = new URLSearchParams({ project });
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    fetch(`/api/cost/nodes?${qs}`)
      .then((r) => r.json())
      .then((rows: NodeCostRow[]) => setData(rows))
      .catch(() => {});
  }, [project, from, to]);

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
      <div
        className="px-4 py-3 text-xs font-semibold uppercase tracking-wide"
        style={{ background: "var(--surface)", color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}
      >
        Cost by node
      </div>
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
              style={{
                borderTop: "1px solid var(--border)",
                background: i % 2 === 0 ? "var(--surface)" : "var(--surface-2)",
              }}
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
        <p className="py-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
          No cost data for this period.
        </p>
      )}
    </div>
  );
}
