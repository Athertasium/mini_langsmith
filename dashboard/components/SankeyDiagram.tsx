"use client";

import { useEffect, useRef, useState } from "react";
import { sankey, sankeyLinkHorizontal, type SankeyGraph } from "d3-sankey";
import { toSankeyData, type PathRow, type SankeyNode, type SankeyLink } from "@/lib/sankey-transform";
import Link from "next/link";

interface Props {
  project: string;
  from?: string;
  to?: string;
}

interface RichLink extends SankeyLink {
  sessionIds: string[];
}

const WIDTH = 900;
const HEIGHT = 480;
const NODE_WIDTH = 18;
const NODE_PADDING = 20;

export function SankeyDiagram({ project, from, to }: Props) {
  const [rows, setRows] = useState<PathRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredLink, setHoveredLink] = useState<RichLink | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ project });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    fetch(`/api/paths?${params}`)
      .then((r) => r.json())
      .then((data: PathRow[]) => {
        setRows(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load path data");
        setLoading(false);
      });
  }, [project, from, to]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center" style={{ color: "var(--text-secondary)" }}>
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center text-red-400">{error}</div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center" style={{ color: "var(--text-secondary)" }}>
        No path data for <strong className="mx-1">{project}</strong> in this time range.
        Traces need session_id populated (SDK v2+) and at least 2 chain spans per session.
      </div>
    );
  }

  const { nodes, links } = toSankeyData(rows);

  if (nodes.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center" style={{ color: "var(--text-secondary)" }}>
        Each session only has 1 span — nothing to flow between. Add named nodes (e.g. <code>RunnableLambda.with_config(run_name=&quot;step&quot;)</code>) to produce multi-step paths.
      </div>
    );
  }

  type D3Node = SankeyNode & { x0?: number; x1?: number; y0?: number; y1?: number; index?: number };
  type D3Link = RichLink & {
    width?: number;
    y0?: number;
    y1?: number;
    source: number | D3Node;
    target: number | D3Node;
  };

  let graph: SankeyGraph<D3Node, D3Link>;
  try {
    graph = sankey<SankeyNode, RichLink>()
      .nodeWidth(NODE_WIDTH)
      .nodePadding(NODE_PADDING)
      .extent([[1, 1], [WIDTH - 1, HEIGHT - 5]])({
        nodes: nodes.map((n) => ({ ...n })),
        links: (links as RichLink[]).map((l) => ({ ...l })),
      }) as SankeyGraph<D3Node, D3Link>;
  } catch (e) {
    return (
      <div className="flex h-64 items-center justify-center" style={{ color: "var(--text-secondary)" }}>
        Could not render Sankey — paths contain cycles or duplicate node names.
        {" "}<span style={{ fontSize: 11 }}>{String(e)}</span>
      </div>
    );
  }

  const accent = "#6366f1";
  const accentHover = "#818cf8";
  const surface2 = "#22263a";
  const textPrimary = "#e8eaf6";
  const textSecondary = "#8b8fa8";

  const nodeColor = (i: number) => {
    const palette = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6"];
    return palette[i % palette.length];
  };

  return (
    <div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        style={{ width: "100%", height: "auto", background: surface2, borderRadius: 8 }}
      >
        {/* Links */}
        {graph.links.map((link, i) => {
          const isHovered = hoveredLink === (link as unknown as RichLink);
          return (
            <g key={i}>
              <path
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                d={sankeyLinkHorizontal()(link as any) ?? ""}
                fill="none"
                stroke={isHovered ? accentHover : accent}
                strokeOpacity={isHovered ? 0.6 : 0.3}
                strokeWidth={Math.max(1, link.width ?? 1)}
                style={{ cursor: "pointer", transition: "stroke-opacity 0.15s" }}
                onMouseEnter={() => setHoveredLink(link as unknown as RichLink)}
                onMouseLeave={() => setHoveredLink(null)}
              />
            </g>
          );
        })}

        {/* Nodes */}
        {graph.nodes.map((node, i) => {
          const x0 = isFinite(node.x0 ?? NaN) ? (node.x0 ?? 0) : 0;
          const x1 = isFinite(node.x1 ?? NaN) ? (node.x1 ?? 0) : 0;
          const y0 = isFinite(node.y0 ?? NaN) ? (node.y0 ?? 0) : 0;
          const y1 = isFinite(node.y1 ?? NaN) ? (node.y1 ?? 0) : 0;
          const labelRight = x0 < WIDTH / 2;
          const labelX = labelRight ? x1 + 6 : x0 - 6;
          const labelAnchor = labelRight ? "start" : "end";
          const parts = node.name.split(":");
          const nodeName = parts[0];
          const decision = parts[1];

          return (
            <g key={i}>
              <rect
                x={x0}
                y={y0}
                width={x1 - x0}
                height={Math.max(1, y1 - y0)}
                fill={nodeColor(i)}
                rx={3}
              />
              <text
                x={labelX}
                y={(y0 + y1) / 2}
                dy="0.35em"
                textAnchor={labelAnchor}
                fontSize={11}
                fill={textPrimary}
                style={{ pointerEvents: "none" }}
              >
                {nodeName}
              </text>
              {decision && (
                <text
                  x={labelX}
                  y={(y0 + y1) / 2 + 13}
                  dy="0.35em"
                  textAnchor={labelAnchor}
                  fontSize={9}
                  fill={textSecondary}
                  style={{ pointerEvents: "none" }}
                >
                  :{decision}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Link tooltip / click-through */}
      {hoveredLink && (
        <div
          className="mt-3 rounded p-3 text-sm"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
        >
          <span style={{ color: textPrimary }}>
            {(hoveredLink.source as unknown as D3Node).name} → {(hoveredLink.target as unknown as D3Node).name}
          </span>
          {"  "}
          <span>{hoveredLink.value} trace{hoveredLink.value !== 1 ? "s" : ""}</span>
          {"  "}
          <Link
            href={`/traces?project=${encodeURIComponent(project)}&sessions=${hoveredLink.sessionIds.slice(0, 50).join(",")}`}
            className="underline"
            style={{ color: accent }}
          >
            View traces →
          </Link>
        </div>
      )}
    </div>
  );
}
