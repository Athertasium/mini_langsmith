export interface PathRow {
  path: string;
  frequency: number;
  session_ids: string[];
}

export interface SankeyNode {
  name: string;
}

export interface SankeyLink {
  source: number;
  target: number;
  value: number;
  sessionIds: string[];
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

/**
 * Reshape path-frequency rows into d3-sankey nodes/links.
 *
 * Each path is a "→"-separated sequence like "recall → router:cold_start → respond".
 * Transitions between consecutive steps become links; link values are summed across paths.
 * Nodes are keyed by their label so "router:cold_start" and "router:proceed" are distinct.
 */
export function toSankeyData(rows: PathRow[]): SankeyData {
  const nodeIndex = new Map<string, number>();
  const nodes: SankeyNode[] = [];

  const linkKey = (s: number, t: number) => `${s}__${t}`;
  const linkMap = new Map<string, { source: number; target: number; value: number; sessionIds: string[] }>();

  function getNode(label: string): number {
    const existing = nodeIndex.get(label);
    if (existing !== undefined) return existing;
    const idx = nodes.length;
    nodes.push({ name: label });
    nodeIndex.set(label, idx);
    return idx;
  }

  for (const row of rows) {
    const steps = row.path.split(" → ").map((s) => s.trim()).filter(Boolean);
    if (steps.length < 2) continue;

    for (let i = 0; i < steps.length - 1; i++) {
      const src = getNode(steps[i]);
      const tgt = getNode(steps[i + 1]);
      const key = linkKey(src, tgt);
      const existing = linkMap.get(key);
      if (existing) {
        existing.value += row.frequency;
        for (const id of row.session_ids) {
          if (!existing.sessionIds.includes(id)) existing.sessionIds.push(id);
        }
      } else {
        linkMap.set(key, {
          source: src,
          target: tgt,
          value: row.frequency,
          sessionIds: [...row.session_ids],
        });
      }
    }
  }

  return { nodes, links: Array.from(linkMap.values()) };
}
