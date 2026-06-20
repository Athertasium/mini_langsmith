"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { JsonView, allExpanded, darkStyles } from "react-json-view-lite";
import "react-json-view-lite/dist/index.css";
import { SparklineChart } from "@/components/SparklineChart";
import type { Run } from "@/lib/db";

const RUN_TYPE_STYLES: Record<string, { bg: string; color: string }> = {
  llm:       { bg: "var(--llm-bg)",       color: "var(--llm-color)" },
  chain:     { bg: "var(--chain-bg)",     color: "var(--chain-color)" },
  tool:      { bg: "var(--tool-bg)",      color: "var(--tool-color)" },
  retriever: { bg: "var(--retriever-bg)", color: "var(--retriever-color)" },
};

function JsonField({ value }: { value: unknown }) {
  if (value === null || value === undefined) return null;
  return (
    <div className="rounded overflow-auto text-xs" style={{ background: "var(--bg-deep)", maxHeight: 400 }}>
      <JsonView data={value} shouldExpandNode={allExpanded} style={darkStyles} />
    </div>
  );
}

function LlmOutputField({ value }: { value: unknown }) {
  const text =
    typeof value === "string"
      ? value
      : typeof value === "object" && value !== null && "text" in (value as Record<string, unknown>)
        ? String((value as Record<string, unknown>).text)
        : typeof value === "object" && value !== null && "content" in (value as Record<string, unknown>)
          ? String((value as Record<string, unknown>).content)
          : null;

  if (text) {
    return (
      <div
        className="prose prose-invert prose-sm max-w-none rounded p-3 text-xs overflow-x-auto"
        style={{ background: "var(--bg-deep)", color: "var(--retriever-color)" }}
      >
        <ReactMarkdown>{text}</ReactMarkdown>
      </div>
    );
  }
  return <JsonField value={value} />;
}

function ErrorBlock({ error }: { error: string }) {
  return (
    <pre
      className="overflow-x-auto rounded p-3 text-xs whitespace-pre-wrap"
      style={{
        background: "var(--error-dim)",
        color: "#fca5a5",
        fontFamily: "var(--font-mono)",
        border: "1px solid rgba(244, 63, 94, 0.3)",
      }}
    >
      {error}
    </pre>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      style={{
        transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
        transition: "transform 150ms ease",
        color: "var(--text-muted)",
        flexShrink: 0,
      }}
    >
      <path
        d="M5 3L9 7L5 11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FieldLabel({ label }: { label: string }) {
  return (
    <p
      className="mb-1.5 text-xs font-medium uppercase tracking-wider"
      style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}
    >
      {label}
    </p>
  );
}

function SpanNode({ span, depth, project }: { span: RunNode; depth: number; project: string }) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = span.children.length > 0;
  const hasError = span.error != null;
  const typeStyle = RUN_TYPE_STYLES[span.run_type] ?? { bg: "var(--surface-high)", color: "var(--text-muted)" };
  const hasExpandable = hasChildren || span.inputs || span.outputs || hasError;

  const isLlm = span.run_type === "llm";

  return (
    <div
      className="rounded-lg mb-2"
      style={{
        marginLeft: depth * 20,
        border: hasError ? "1px solid rgba(244, 63, 94, 0.35)" : "1px solid var(--border)",
        background: hasError ? "rgba(244, 63, 94, 0.04)" : "var(--surface)",
      }}
    >
      <div
        className="flex items-center gap-2.5 px-4 py-2.5"
        style={{ cursor: hasExpandable ? "pointer" : "default" }}
        onClick={() => hasExpandable && setExpanded((v) => !v)}
      >
        {/* Expand chevron */}
        <span style={{ opacity: hasExpandable ? 1 : 0 }}>
          <ChevronIcon expanded={expanded} />
        </span>

        {/* Run type badge */}
        <span
          className="rounded px-2 py-0.5 text-xs font-medium shrink-0"
          style={{
            background: typeStyle.bg,
            color: typeStyle.color,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
          }}
        >
          {span.run_type}
        </span>

        {/* Span name */}
        <span className="flex-1 font-medium text-sm truncate" style={{ color: "var(--text-primary)" }}>
          {span.name}
        </span>

        {/* Sparkline */}
        <SparklineChart project={project} name={span.name} />

        {/* Latency */}
        {span.latency_ms != null && (
          <span
            className="text-xs shrink-0 tabular-nums"
            style={{ color: "var(--accent-hover)", fontFamily: "var(--font-mono)" }}
          >
            {span.latency_ms} ms
          </span>
        )}

        {/* Error badge */}
        {hasError && (
          <span
            className="rounded px-1.5 py-0.5 text-xs font-semibold shrink-0"
            style={{ background: "var(--error-dim)", color: "var(--error-color)" }}
          >
            ERR
          </span>
        )}
      </div>

      {/* Error section */}
      {expanded && hasError && (
        <div className="px-4 pb-4" style={{ borderTop: "1px solid rgba(244, 63, 94, 0.2)" }}>
          <FieldLabel label="Error" />
          <ErrorBlock error={span.error!} />
        </div>
      )}

      {/* Content section */}
      {expanded && !hasError && (span.inputs || span.outputs || span.extra) && (
        <div className="px-4 pb-4 space-y-4" style={{ borderTop: "1px solid var(--border)" }}>
          {span.inputs && (
            <div className="pt-4">
              <FieldLabel label="Inputs" />
              <JsonField value={span.inputs} />
            </div>
          )}
          {span.outputs && (
            <div>
              <FieldLabel label="Outputs" />
              {isLlm ? <LlmOutputField value={span.outputs} /> : <JsonField value={span.outputs} />}
            </div>
          )}
          {span.extra && (
            <div>
              <FieldLabel label="Extra" />
              <JsonField value={span.extra} />
            </div>
          )}
        </div>
      )}

      {/* Children */}
      {expanded && hasChildren && (
        <div className="p-2" style={{ borderTop: "1px solid var(--border)" }}>
          {span.children.map((child) => (
            <SpanNode key={child.id} span={child} depth={0} project={project} />
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

export function TraceTree({ spans, project }: { spans: Run[]; project: string }) {
  const roots = buildTree(spans);
  return (
    <div>
      {roots.map((root) => (
        <SpanNode key={root.id} span={root} depth={0} project={project} />
      ))}
    </div>
  );
}
