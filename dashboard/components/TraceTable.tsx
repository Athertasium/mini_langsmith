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

const columns = [
  col.accessor("name", { header: "Name" }),
  col.accessor("project", { header: "Project" }),
  col.accessor("run_type", { header: "Type" }),
  col.accessor("start_time", {
    header: "Started",
    cell: (info) => {
      const d = new Date(info.getValue());
      return d.toISOString().replace("T", " ").slice(0, 19) + " UTC";
    },
  }),
  col.accessor("latency_ms", {
    header: "Latency",
    cell: (info) => {
      const v = info.getValue();
      return v != null ? `${v} ms` : "—";
    },
  }),
  col.display({
    id: "cost",
    header: "Cost",
    cell: (info) => costUsd(info.row.original),
  }),
  col.accessor("error", {
    header: "Status",
    cell: (info) =>
      info.getValue() ? (
        <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
          ERROR
        </span>
      ) : (
        <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
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
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th
                  key={h.id}
                  className="cursor-pointer select-none px-4 py-3 text-left font-medium text-gray-600 hover:text-gray-900"
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
        <tbody className="divide-y divide-gray-100 bg-white">
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className="cursor-pointer hover:bg-gray-50"
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
        <p className="py-8 text-center text-gray-400">No traces yet.</p>
      )}
    </div>
  );
}
