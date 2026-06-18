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
  // Keyed by "label||stepN" so the same node name at different positions is a
  // distinct Sankey node — prevents back-edges (cycles) from looping graphs.
  const nodeIndex = new Map<string, number>();
  const nodes: SankeyNode[] = [];

  const linkKey = (s: number, t: number) => `${s}__${t}`;
  const linkMap = new Map<string, { source: number; target: number; value: number; sessionIds: string[] }>();

  function getNode(label: string, step: number): number {
    const key = `${label}||pos${step}`;
    const existing = nodeIndex.get(key);
    if (existing !== undefined) return existing;
    const idx = nodes.length;
    nodes.push({ name: label });
    nodeIndex.set(key, idx);
    return idx;
  }

  for (const row of rows) {
    const steps = row.path.split(" → ").map((s) => s.trim()).filter(Boolean);
    if (steps.length < 2) continue;

    for (let i = 0; i < steps.length - 1; i++) {
      const src = getNode(steps[i], i);
      const tgt = getNode(steps[i + 1], i + 1);
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

  // d3-sankey throws on self-loops — drop them
  const safeLinks = Array.from(linkMap.values()).filter((l) => l.source !== l.target);

  // Remove orphaned nodes (not referenced by any link) — d3-sankey produces NaN positions for them.
  // Rebuild a compact node array and remap link indices.
  const usedIndices = new Set<number>();
  for (const l of safeLinks) {
    usedIndices.add(l.source);
    usedIndices.add(l.target);
  }
  const oldToNew = new Map<number, number>();
  const compactNodes: SankeyNode[] = [];
  for (const oldIdx of usedIndices) {
    oldToNew.set(oldIdx, compactNodes.length);
    compactNodes.push(nodes[oldIdx]);
  }
  const compactLinks = safeLinks.map((l) => ({
    ...l,
    source: oldToNew.get(l.source)!,
    target: oldToNew.get(l.target)!,
  }));

  return { nodes: compactNodes, links: compactLinks };
}
