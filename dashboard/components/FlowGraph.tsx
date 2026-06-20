"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  MarkerType,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import * as dagre from "@dagrejs/dagre";
import { toGraphData, type PathRow } from "@/lib/graph-transform";
import Link from "next/link";

const PALETTE = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6"];
const NODE_W = 164;
const NODE_H = 72;

type FlowNodeData = {
  label: string;
  decision?: string;
  frequency: number;
  sessionIds: string[];
  colorIdx: number;
};

type FlowEdgeData = {
  frequency: number;
  sessionIds: string[];
  isCycle: boolean;
};

type FlowNode = Node<FlowNodeData, "flowNode">;
type FlowEdge = Edge<FlowEdgeData>;

function CustomNode({ data }: NodeProps<FlowNode>) {
  const color = PALETTE[data.colorIdx % PALETTE.length];
  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: color, border: "none", width: 8, height: 8 }}
      />
      <div
        style={{
          width: NODE_W,
          height: NODE_H,
          background: color + "1a",
          border: `1.5px solid ${color}99`,
          borderRadius: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          padding: "0 14px",
          userSelect: "none",
          cursor: "grab",
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#e8eaf6",
            lineHeight: 1.2,
            textAlign: "center",
            wordBreak: "break-word",
          }}
        >
          {data.label}
        </span>
        {data.decision && (
          <span
            style={{
              fontSize: 10,
              color: color,
              fontFamily: "monospace",
              lineHeight: 1,
            }}
          >
            :{data.decision}
          </span>
        )}
        <span style={{ fontSize: 10, color: "#8b8fa8", lineHeight: 1 }}>
          {data.frequency} sessions
        </span>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: color, border: "none", width: 8, height: 8 }}
      />
    </>
  );
}

const nodeTypes = { flowNode: CustomNode };

function applyDagreLayout(nodes: FlowNode[], edges: FlowEdge[]): FlowNode[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 60, ranksep: 110, marginx: 30, marginy: 30 });

  nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  // Cycle edges are excluded from layout to preserve DAG property
  edges.forEach((e) => {
    if (!e.data?.isCycle) g.setEdge(e.source, e.target);
  });

  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    return {
      ...n,
      position: {
        x: (pos?.x ?? 0) - NODE_W / 2,
        y: (pos?.y ?? 0) - NODE_H / 2,
      },
    };
  });
}

interface HoverInfo {
  type: "node" | "edge";
  label: string;
  frequency: number;
  sessionIds: string[];
  isCycle?: boolean;
}

interface Props {
  project: string;
  from?: string;
  to?: string;
}

export function FlowGraph({ project, from, to }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isEmpty, setIsEmpty] = useState(false);
  const [hovered, setHovered] = useState<HoverInfo | null>(null);

  useEffect(() => {
    setLoading(true);
    setFetchError(null);
    setIsEmpty(false);

    const params = new URLSearchParams({ project });
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    fetch(`/api/paths?${params}`)
      .then((r) => r.json())
      .then((rows: PathRow[]) => {
        if (rows.length === 0) {
          setIsEmpty(true);
          setLoading(false);
          return;
        }

        const { nodes: gNodes, edges: gEdges } = toGraphData(rows);

        if (gNodes.length === 0) {
          setIsEmpty(true);
          setLoading(false);
          return;
        }

        const rfNodes: FlowNode[] = gNodes.map((n, i) => ({
          id: n.id,
          type: "flowNode" as const,
          position: { x: 0, y: 0 },
          data: {
            label: n.name,
            decision: n.decision,
            frequency: n.frequency,
            sessionIds: n.sessionIds,
            colorIdx: i,
          },
        }));

        const rfEdges: FlowEdge[] = gEdges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          type: e.isCycle ? "default" : "smoothstep",
          label: `${e.frequency}×`,
          labelStyle: { fill: "#8b8fa8", fontSize: 10, fontFamily: "monospace" },
          labelBgStyle: { fill: "#0b0e1a", fillOpacity: 0.85 },
          labelBgPadding: [4, 2] as [number, number],
          style: e.isCycle
            ? { stroke: "#f59e0b", strokeDasharray: "6 4", strokeWidth: 1.5 }
            : {
                stroke: "#4b5280",
                strokeWidth: Math.max(1.5, Math.min(4, e.frequency / 5)),
              },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: e.isCycle ? "#f59e0b" : "#4b5280",
          },
          data: { frequency: e.frequency, sessionIds: e.sessionIds, isCycle: e.isCycle },
        }));

        const layouted = applyDagreLayout(rfNodes, rfEdges);
        setNodes(layouted);
        setEdges(rfEdges);
        setLoading(false);
      })
      .catch(() => {
        setFetchError("Failed to load path data.");
        setLoading(false);
      });
  }, [project, from, to]);

  const onNodeMouseEnter = useCallback(
    (_: React.MouseEvent, node: FlowNode) => {
      setHovered({
        type: "node",
        label: node.data.decision
          ? `${node.data.label}:${node.data.decision}`
          : node.data.label,
        frequency: node.data.frequency,
        sessionIds: node.data.sessionIds,
      });
    },
    []
  );

  const onNodeMouseLeave = useCallback(() => setHovered(null), []);

  const onEdgeMouseEnter = useCallback(
    (_: React.MouseEvent, edge: FlowEdge) => {
      setHovered({
        type: "edge",
        label: `${edge.source} → ${edge.target}`,
        frequency: edge.data?.frequency ?? 0,
        sessionIds: edge.data?.sessionIds ?? [],
        isCycle: edge.data?.isCycle,
      });
    },
    []
  );

  const onEdgeMouseLeave = useCallback(() => setHovered(null), []);

  if (loading) {
    return (
      <div
        className="flex h-64 items-center justify-center"
        style={{ color: "var(--text-secondary)" }}
      >
        Loading…
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex h-64 items-center justify-center text-red-400">
        {fetchError}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div
        className="flex h-64 items-center justify-center text-center"
        style={{ color: "var(--text-secondary)" }}
      >
        No path data for <strong className="mx-1">{project}</strong> in this time range.
        <br />
        Traces need session_id populated and at least 2 chain spans per session.
      </div>
    );
  }

  return (
    <div>
      <div style={{ height: 520, borderRadius: 8, overflow: "hidden" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          onNodeMouseEnter={onNodeMouseEnter}
          onNodeMouseLeave={onNodeMouseLeave}
          onEdgeMouseEnter={onEdgeMouseEnter}
          onEdgeMouseLeave={onEdgeMouseLeave}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          nodesConnectable={false}
          deleteKeyCode={null}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="#1e2235"
            style={{ background: "#0b0e1a" }}
          />
          <Controls />
        </ReactFlow>
      </div>

      {hovered && (
        <div
          className="mt-3 rounded p-3 text-sm"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
          }}
        >
          <span style={{ color: "#e8eaf6", fontWeight: 600 }}>{hovered.label}</span>
          {"  "}
          <span>
            {hovered.frequency}{" "}
            {hovered.type === "edge"
              ? `trace${hovered.frequency !== 1 ? "s" : ""}`
              : "sessions"}
          </span>
          {hovered.isCycle && (
            <span
              className="ml-2 rounded px-1.5 py-0.5 text-xs"
              style={{ background: "#f59e0b22", color: "#f59e0b" }}
            >
              cycle
            </span>
          )}
          {"  "}
          {hovered.sessionIds.length > 0 && (
            <Link
              href={`/traces?project=${encodeURIComponent(project)}&sessions=${hovered.sessionIds.slice(0, 50).join(",")}`}
              className="underline"
              style={{ color: "#6366f1" }}
            >
              View traces →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
