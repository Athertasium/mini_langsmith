"use client";

import { useState } from "react";
import type { Run } from "@/lib/db";

const RUN_TYPE_STYLES: Record<string, { bg: string; color: string }> = {
  llm:       { bg: "#1e2a4a", color: "#818cf8" },
  chain:     { bg: "#2a1e4a", color: "#c084fc" },
  tool:      { bg: "#2a2a1e", color: "#facc15" },
  retriever: { bg: "#1e2a2a", color: "#34d399" },
};

function SpanNode({ span, depth }: { span: RunNode; depth: number }) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = span.children.length > 0;
  const hasError = span.error != null;
  const typeStyle = RUN_TYPE_STYLES[span.run_type] ?? { bg: "#1e2030", color: "#8b8fa8" };

  const borderColor = hasError ? "#dc2626" : "var(--border)";
  const bgColor = hasError ? "#1f0a0a" : "var(--surface)";

  return (
    <div
      className="rounded-lg mb-2"
      style={{
        marginLeft: depth * 20,
        border: `1px solid ${borderColor}`,
        background: bgColor,
      }}
    >
      <div
        className="flex cursor-pointer items-center gap-3 px-4 py-3"
        onClick={() => setExpanded((v) => !v)}
      >
        <span
          className="rounded px-2 py-0.5 text-xs font-medium shrink-0"
          style={{ background: typeStyle.bg, color: typeStyle.color }}
        >
          {span.run_type}
        </span>
        <span className="flex-1 font-medium text-sm" style={{ color: "var(--text-primary)" }}>
          {span.name}
        </span>
        {span.latency_ms != null && (
          <span
            className="text-xs shrink-0"
            style={{ color: "#818cf8", fontFamily: "var(--font-geist-mono)" }}
          >
            {span.latency_ms} ms
          </span>
        )}
        {hasError && (
          <span className="rounded px-2 py-0.5 text-xs font-bold shrink-0" style={{ background: "#3f1515", color: "#f87171" }}>
            ERROR
          </span>
        )}
        {(hasChildren || span.inputs || span.outputs) && (
          <span className="text-xs shrink-0" style={{ color: "var(--text-secondary)" }}>
            {expanded ? "▲" : "▼"}
          </span>
        )}
      </div>

      {hasError && (
        <div
          className="px-4 py-2 text-sm"
          style={{ borderTop: "1px solid #7f1d1d", background: "#2a0a0a", color: "#fca5a5" }}
        >
          <strong>Error:</strong> {span.error}
        </div>
      )}

      {expanded && (span.inputs || span.outputs) && (
        <div className="px-4 py-3 text-sm" style={{ borderTop: "1px solid var(--border)" }}>
          {span.inputs && (
            <div className="mb-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
                Inputs
              </p>
              <pre
                className="overflow-x-auto rounded p-3 text-xs"
                style={{ background: "var(--background)", color: "#a5b4fc", fontFamily: "var(--font-geist-mono)" }}
              >
                {JSON.stringify(span.inputs, null, 2)}
              </pre>
            </div>
          )}
          {span.outputs && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
                Outputs
              </p>
              <pre
                className="overflow-x-auto rounded p-3 text-xs"
                style={{ background: "var(--background)", color: "#86efac", fontFamily: "var(--font-geist-mono)" }}
              >
                {JSON.stringify(span.outputs, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {expanded && hasChildren && (
        <div className="pb-2 pr-2" style={{ borderTop: "1px solid var(--border)" }}>
          {span.children.map((child) => (
            <SpanNode key={child.id} span={child} depth={0} />
          ))}
        </div>
      )}
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
