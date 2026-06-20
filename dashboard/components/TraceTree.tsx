"use client";

import { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { JsonView, allExpanded, darkStyles } from "react-json-view-lite";
import "react-json-view-lite/dist/index.css";
import { SparklineChart } from "@/components/SparklineChart";
import type { Run } from "@/lib/db";

/* ── Design tokens per run_type ─────────────────────────────────────────── */
const TYPE_STYLES: Record<string, { badge: string; text: string; bar: string }> = {
  llm:       { badge: "rgba(99,102,241,0.22)",  text: "#818cf8", bar: "#6366f1" },
  chain:     { badge: "rgba(168,85,247,0.22)",  text: "#c084fc", bar: "#a855f7" },
  tool:      { badge: "rgba(251,191,36,0.18)",  text: "#fbbf24", bar: "#f59e0b" },
  retriever: { badge: "rgba(16,185,129,0.18)",  text: "#4edea3", bar: "#10b981" },
};
const FALLBACK = { badge: "rgba(255,255,255,0.08)", text: "#908fa0", bar: "#908fa0" };

const BAR_MAX_PX = 96;

/* ── Sub-components ─────────────────────────────────────────────────────── */
function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12" height="12" viewBox="0 0 12 12" fill="none"
      aria-hidden="true"
      style={{
        transform: open ? "rotate(90deg)" : "rotate(0deg)",
        transition: "transform 150ms ease",
        color: "var(--text-muted)",
        flexShrink: 0,
      }}
    >
      <path d="M4 2.5L8 6L4 9.5" stroke="currentColor" strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FieldLabel({ label }: { label: string }) {
  return (
    <p className="mb-1.5 text-xs font-medium uppercase tracking-wider"
      style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>
      {label}
    </p>
  );
}

function JsonField({ value }: { value: unknown }) {
  if (value === null || value === undefined) return null;
  return (
    <div className="rounded overflow-auto text-xs" style={{ background: "var(--bg-deep)", maxHeight: 360 }}>
      <JsonView data={value} shouldExpandNode={allExpanded} style={darkStyles} />
    </div>
  );
}

function LlmOutputField({ value }: { value: unknown }) {
  const text =
    typeof value === "string" ? value
    : typeof value === "object" && value !== null && "text" in (value as Record<string, unknown>)
      ? String((value as Record<string, unknown>).text)
    : typeof value === "object" && value !== null && "content" in (value as Record<string, unknown>)
      ? String((value as Record<string, unknown>).content)
    : null;

  if (text) {
    return (
      <div className="prose prose-invert prose-sm max-w-none rounded p-3 text-xs overflow-x-auto"
        style={{ background: "var(--bg-deep)", color: "var(--retriever-color)" }}>
        <ReactMarkdown>{text}</ReactMarkdown>
      </div>
    );
  }
  return <JsonField value={value} />;
}

function ErrorBlock({ error }: { error: string }) {
  return (
    <pre className="overflow-x-auto rounded p-3 text-xs whitespace-pre-wrap"
      style={{
        background: "var(--error-dim)",
        color: "#fca5a5",
        fontFamily: "var(--font-mono)",
        border: "1px solid rgba(244,63,94,0.3)",
      }}>
      {error}
    </pre>
  );
}

/* ── Duration bar ────────────────────────────────────────────────────────── */
function DurationBar({ latency, maxLatency, color }: { latency: number; maxLatency: number; color: string }) {
  const pct = maxLatency > 0 ? Math.max(latency / maxLatency, 0.03) : 0.03;
  const width = Math.round(pct * BAR_MAX_PX);
  return (
    <span
      style={{
        display: "inline-block",
        width: BAR_MAX_PX,
        height: 6,
        background: "var(--surface-high)",
        borderRadius: 3,
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      <span style={{
        display: "block",
        width,
        height: "100%",
        background: color,
        borderRadius: 3,
        opacity: 0.85,
      }} />
    </span>
  );
}

/* ── Tree connector lines ────────────────────────────────────────────────── */
function TreeLines({ depth, isLast }: { depth: number; isLast: boolean }) {
  if (depth === 0) return null;
  return (
    <span style={{ display: "flex", alignItems: "stretch", flexShrink: 0, width: depth * 20, position: "relative" }}>
      {Array.from({ length: depth }).map((_, i) => (
        <span key={i} style={{ width: 20, flexShrink: 0, position: "relative" }}>
          {i === depth - 1 ? (
            /* Last level: elbow */
            <span style={{
              position: "absolute",
              left: 9,
              top: 0,
              bottom: isLast ? "50%" : 0,
              borderLeft: "1px solid rgba(255,255,255,0.1)",
            }} />
          ) : (
            /* Ancestor levels: straight vertical */
            <span style={{
              position: "absolute",
              left: 9,
              top: 0,
              bottom: 0,
              borderLeft: "1px solid rgba(255,255,255,0.07)",
            }} />
          )}
        </span>
      ))}
      {/* Horizontal arm at last level */}
      <span style={{
        position: "absolute",
        right: 0,
        top: "50%",
        width: 8,
        borderTop: "1px solid rgba(255,255,255,0.1)",
      }} />
    </span>
  );
}

/* ── SpanRow — one flat row in the tree ─────────────────────────────────── */
interface SpanRowProps {
  span: RunNode;
  depth: number;
  isLast: boolean;
  project: string;
  maxLatency: number;
}

function SpanRow({ span, depth, isLast, project, maxLatency }: SpanRowProps) {
  const [open, setOpen] = useState(false);
  const hasChildren = span.children.length > 0;
  const hasDetail = !!(span.inputs || span.outputs || span.extra || span.error);
  const hasError = span.error != null;
  const tok = TYPE_STYLES[span.run_type] ?? FALLBACK;

  return (
    <>
      {/* Row */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setOpen((v) => !v)}
        className="span-row"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          paddingTop: 5,
          paddingBottom: 5,
          paddingLeft: 12,
          paddingRight: 12,
          cursor: "pointer",
          borderRadius: 6,
          userSelect: "none",
          outline: "none",
          borderLeft: hasError ? "2px solid rgba(244,63,94,0.6)" : "2px solid transparent",
        }}
      >
        {/* Tree connector */}
        <TreeLines depth={depth} isLast={isLast} />

        {/* Chevron */}
        <span style={{ opacity: hasChildren || hasDetail ? 1 : 0.2, flexShrink: 0 }}>
          <Chevron open={open} />
        </span>

        {/* Type badge */}
        <span
          style={{
            background: tok.badge,
            color: tok.text,
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.06em",
            padding: "2px 6px",
            borderRadius: 4,
            flexShrink: 0,
            textTransform: "uppercase",
          }}
        >
          {span.run_type}
        </span>

        {/* Name */}
        <span
          className="truncate"
          style={{
            flex: "1 1 0",
            fontSize: 13,
            fontWeight: 500,
            color: "var(--text-primary)",
            minWidth: 0,
          }}
        >
          {span.name}
        </span>

        {/* Sparkline */}
        <SparklineChart project={project} name={span.name} />

        {/* Latency */}
        {span.latency_ms != null ? (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--text-muted)",
              flexShrink: 0,
              minWidth: 58,
              textAlign: "right",
              tabularNums: "true",
            } as React.CSSProperties}
          >
            {span.latency_ms}ms
          </span>
        ) : (
          <span style={{ minWidth: 58 }} />
        )}

        {/* Duration bar */}
        <DurationBar
          latency={span.latency_ms ?? 0}
          maxLatency={maxLatency}
          color={tok.bar}
        />

        {/* Error badge */}
        {hasError && (
          <span style={{
            background: "var(--error-dim)",
            color: "var(--error-color)",
            fontSize: 10,
            fontWeight: 600,
            padding: "2px 5px",
            borderRadius: 4,
            flexShrink: 0,
          }}>
            ERR
          </span>
        )}
      </div>

      {/* Expanded detail panel */}
      {open && hasDetail && (
        <div
          style={{
            marginLeft: depth * 20 + 44,
            marginBottom: 4,
            padding: "10px 12px",
            background: "var(--bg-deep)",
            borderRadius: 6,
            border: "1px solid var(--border)",
          }}
        >
          {hasError && (
            <div className="mb-3">
              <FieldLabel label="Error" />
              <ErrorBlock error={span.error!} />
            </div>
          )}
          {!hasError && (
            <>
              {span.inputs && (
                <div className="mb-3">
                  <FieldLabel label="Inputs" />
                  <JsonField value={span.inputs} />
                </div>
              )}
              {span.outputs && (
                <div className="mb-3">
                  <FieldLabel label="Outputs" />
                  {span.run_type === "llm"
                    ? <LlmOutputField value={span.outputs} />
                    : <JsonField value={span.outputs} />}
                </div>
              )}
              {span.extra && (
                <div>
                  <FieldLabel label="Extra" />
                  <JsonField value={span.extra} />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Children */}
      {open && hasChildren &&
        span.children.map((child, i) => (
          <SpanRow
            key={child.id}
            span={child}
            depth={depth + 1}
            isLast={i === span.children.length - 1}
            project={project}
            maxLatency={maxLatency}
          />
        ))
      }
    </>
  );
}

/* ── Tree ────────────────────────────────────────────────────────────────── */
interface RunNode extends Run {
  children: RunNode[];
}

function buildTree(runs: Run[]): RunNode[] {
  const map = new Map<string, RunNode>();
  for (const run of runs) map.set(run.id, { ...run, children: [] });
  const roots: RunNode[] = [];
  for (const node of map.values()) {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export function TraceTree({ spans, project }: { spans: Run[]; project: string }) {
  const roots = useMemo(() => buildTree(spans), [spans]);
  const maxLatency = useMemo(
    () => spans.reduce((m, s) => Math.max(m, s.latency_ms ?? 0), 0),
    [spans]
  );

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "6px 4px",
      }}
    >
      <style>{`
        .span-row:hover {
          background: var(--surface-high) !important;
        }
        .span-row:focus-visible {
          box-shadow: 0 0 0 2px var(--accent);
        }
      `}</style>

      {roots.map((root, i) => (
        <SpanRow
          key={root.id}
          span={root}
          depth={0}
          isLast={i === roots.length - 1}
          project={project}
          maxLatency={maxLatency}
        />
      ))}
    </div>
  );
}
