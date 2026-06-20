export interface PathRow {
  path: string;
  frequency: number;
  session_ids: string[];
}

export interface GraphNode {
  id: string;
  name: string;
  decision?: string;
  frequency: number;
  sessionIds: string[];
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  frequency: number;
  sessionIds: string[];
  isCycle: boolean;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function toGraphData(rows: PathRow[]): GraphData {
  const nodeMap = new Map<string, GraphNode>();
  const edgeMap = new Map<string, GraphEdge>();

  for (const row of rows) {
    const steps = row.path
      .split(" → ")
      .map((s) => s.trim())
      .filter(Boolean);
    if (steps.length === 0) continue;

    for (const step of steps) {
      const colonIdx = step.indexOf(":");
      const name = colonIdx >= 0 ? step.slice(0, colonIdx) : step;
      const decision = colonIdx >= 0 ? step.slice(colonIdx + 1) : undefined;

      if (!nodeMap.has(step)) {
        nodeMap.set(step, { id: step, name, decision, frequency: 0, sessionIds: [] });
      }
      const node = nodeMap.get(step)!;
      node.frequency += row.frequency;
      for (const sid of row.session_ids) {
        if (!node.sessionIds.includes(sid)) node.sessionIds.push(sid);
      }
    }

    for (let i = 0; i < steps.length - 1; i++) {
      const src = steps[i];
      const tgt = steps[i + 1];
      const key = `${src}__${tgt}`;

      if (!edgeMap.has(key)) {
        edgeMap.set(key, {
          id: key,
          source: src,
          target: tgt,
          frequency: 0,
          sessionIds: [],
          isCycle: false,
        });
      }
      const edge = edgeMap.get(key)!;
      edge.frequency += row.frequency;
      for (const sid of row.session_ids) {
        if (!edge.sessionIds.includes(sid)) edge.sessionIds.push(sid);
      }
    }
  }

  const nodes = Array.from(nodeMap.values());
  const edges = Array.from(edgeMap.values());

  // 3-colour DFS cycle detection (WHITE=0, GRAY=1, BLACK=2)
  const color = new Map<string, 0 | 1 | 2>();
  const adj = new Map<string, string[]>();
  for (const n of nodes) {
    color.set(n.id, 0);
    adj.set(n.id, []);
  }
  for (const e of edges) adj.get(e.source)?.push(e.target);

  const cycleIds = new Set<string>();

  function dfs(id: string) {
    color.set(id, 1);
    for (const nb of adj.get(id) ?? []) {
      if (color.get(nb) === 1) {
        cycleIds.add(`${id}__${nb}`);
      } else if (color.get(nb) === 0) {
        dfs(nb);
      }
    }
    color.set(id, 2);
  }

  for (const n of nodes) {
    if (color.get(n.id) === 0) dfs(n.id);
  }

  for (const e of edges) {
    if (cycleIds.has(e.id)) e.isCycle = true;
  }

  return { nodes, edges };
}
