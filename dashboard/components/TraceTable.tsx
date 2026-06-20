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
  const total = run.total_cost_usd;
  if (total == null || total === 0) return "—";
  return `$${Number(total).toFixed(4)}`;
}

function inputPreview(run: Run): string {
  if (!run.inputs) return "—";
  try {
    const s = JSON.stringify(run.inputs);
    return s.length > 80 ? s.slice(0, 80) + "…" : s;
  } catch {
    return "—";
  }
}

const RUN_TYPE_STYLES: Record<string, { bg: string; color: string }> = {
  llm:       { bg: "var(--llm-bg)",       color: "var(--llm-color)" },
  chain:     { bg: "var(--chain-bg)",      color: "var(--chain-color)" },
  tool:      { bg: "var(--tool-bg)",       color: "var(--tool-color)" },
  retriever: { bg: "var(--retriever-bg)",  color: "var(--retriever-color)" },
};

function SortIcon({ dir }: { dir: "asc" | "desc" | false }) {
  if (!dir) return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden style={{ opacity: 0.3 }}>
      <path d="M5 2V8M2 5L5 2L8 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden style={{ color: "var(--accent-hover)" }}>
      {dir === "asc"
        ? <path d="M5 2V8M2 5L5 2L8 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        : <path d="M5 8V2M2 5L5 8L8 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      }
    </svg>
  );
}

const columns = [
  col.accessor("name", {
    header: "Name",
    cell: (info) => (
      <span className="font-medium" style={{ color: "var(--text-primary)" }}>
        {info.getValue()}
      </span>
    ),
  }),
  col.accessor("run_type", {
    header: "Type",
    cell: (info) => {
      const v = info.getValue();
      const s = RUN_TYPE_STYLES[v] ?? { bg: "var(--surface-high)", color: "var(--text-muted)" };
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
  col.display({
    id: "input",
    header: "Input",
    cell: (info) => (
      <span
        className="font-normal truncate max-w-[200px] block"
        style={{
          color: "var(--text-muted)",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
        }}
      >
        {inputPreview(info.row.original)}
      </span>
    ),
  }),
  col.accessor("start_time", {
    header: "Started",
    cell: (info) => {
      const d = new Date(info.getValue());
      return (
        <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 11 }}>
          {d.toISOString().replace("T", " ").slice(0, 19)}
        </span>
      );
    },
  }),
  col.accessor("latency_ms", {
    header: "Latency",
    cell: (info) => {
      const v = info.getValue();
      if (v == null) return <span style={{ color: "var(--text-muted)" }}>—</span>;
      const color = v > 5000 ? "var(--error-color)" : v > 2000 ? "var(--tool-color)" : "var(--accent-hover)";
      return (
        <span style={{ color, fontFamily: "var(--font-mono)", fontSize: 11 }}>
          {v >= 1000 ? `${(v / 1000).toFixed(2)}s` : `${v}ms`}
        </span>
      );
    },
  }),
  col.display({
    id: "cost",
    header: "Cost",
    cell: (info) => (
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)" }}>
        {costUsd(info.row.original)}
      </span>
    ),
  }),
  col.accessor("error", {
    header: "Status",
    cell: (info) =>
      info.getValue() ? (
        <span
          className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium"
          style={{ background: "var(--error-dim)", color: "var(--error-color)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--error-color)" }} />
          Error
        </span>
      ) : (
        <span
          className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium"
          style={{ background: "var(--success-dim)", color: "var(--success)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--success)" }} />
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
      className="overflow-x-auto rounded-xl"
      style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
    >
      <table className="min-w-full text-sm">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} style={{ borderBottom: "1px solid var(--border)" }}>
              {hg.headers.map((h) => (
                <th
                  key={h.id}
                  className="cursor-pointer select-none px-4 py-3 text-left"
                  style={{
                    background: "var(--surface-low)",
                    color: "var(--text-muted)",
                  }}
                  onClick={h.column.getToggleSortingHandler()}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        fontWeight: 500,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                      }}
                    >
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </span>
                    <SortIcon dir={h.column.getIsSorted()} />
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row, i) => (
            <tr
              key={row.id}
              className="trace-row cursor-pointer"
              style={{
                borderBottom:
                  i < table.getRowModel().rows.length - 1
                    ? "1px solid var(--border)"
                    : "none",
                transition: "background 100ms",
              }}
              onClick={() => router.push(`/traces/${row.original.id}`)}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {data.length === 0 && (
        <div className="py-20 text-center">
          <div
            className="mx-auto mb-4 w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "var(--surface-high)" }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <polyline points="2,10 5,6 8,9 11,4 14,7" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            No traces found
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
            Send traces from your application to see them here.
          </p>
        </div>
      )}
    </div>
  );
}
