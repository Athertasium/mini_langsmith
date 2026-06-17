"use client";

import { useState } from "react";
import type { Run } from "@/lib/db";

const RUN_TYPE_COLORS: Record<string, string> = {
  llm: "bg-blue-100 text-blue-700",
  chain: "bg-purple-100 text-purple-700",
  tool: "bg-yellow-100 text-yellow-700",
  retriever: "bg-green-100 text-green-700",
};

function SpanNode({ span, depth }: { span: RunNode; depth: number }) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = span.children.length > 0;
  const hasError = span.error != null;
  const badgeClass =
    RUN_TYPE_COLORS[span.run_type] ?? "bg-gray-100 text-gray-700";

  return (
    <div
      className={`rounded-lg border ${hasError ? "border-red-400 bg-red-50" : "border-gray-200 bg-white"} mb-2`}
      style={{ marginLeft: depth * 20 }}
    >
      <div
        className="flex cursor-pointer items-center gap-3 px-4 py-3"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${badgeClass}`}>
          {span.run_type}
        </span>
        <span className="flex-1 font-medium text-gray-900">{span.name}</span>
        {span.latency_ms != null && (
          <span className="text-sm text-black">{span.latency_ms} ms</span>
        )}
        {hasError && (
          <span className="rounded bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
            ERROR
          </span>
        )}
        {(hasChildren || span.inputs || span.outputs) && (
          <span className="text-black">{expanded ? "▲" : "▼"}</span>
        )}
      </div>

      {hasError && (
        <div className="border-t border-red-300 bg-red-100 px-4 py-2 text-sm text-red-800">
          <strong>Error:</strong> {span.error}
        </div>
      )}

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 text-sm">
          {span.inputs && (
            <div className="mb-3">
              <p className="mb-1 font-medium text-gray-600">Inputs</p>
              <pre className="overflow-x-auto rounded bg-gray-50 p-2 text-xs">
                {JSON.stringify(span.inputs, null, 2)}
              </pre>
            </div>
          )}
          {span.outputs && (
            <div>
              <p className="mb-1 font-medium text-gray-600">Outputs</p>
              <pre className="overflow-x-auto rounded bg-gray-50 p-2 text-xs">
                {JSON.stringify(span.outputs, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {expanded &&
        span.children.map((child) => (
          <SpanNode key={child.id} span={child} depth={0} />
        ))}
    </div>
  );
}

interface RunNode extends Run {
  children: RunNode[];
}

function buildTree(runs: Run[]): RunNode[] {
  const nodeMap = new Map<string, RunNode>();
  for (const run of runs) {
    nodeMap.set(run.id, { ...run, children: [] });
  }
  const roots: RunNode[] = [];
  for (const node of nodeMap.values()) {
    if (node.parent_id && nodeMap.has(node.parent_id)) {
      nodeMap.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export function TraceTree({ spans }: { spans: Run[] }) {
  const roots = buildTree(spans);
  return (
    <div>
      {roots.map((root) => (
        <SpanNode key={root.id} span={root} depth={0} />
      ))}
    </div>
  );
}
