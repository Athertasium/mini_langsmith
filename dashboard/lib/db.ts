import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

function getPool(): Pool {
  if (!global._pgPool) {
    global._pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }
  return global._pgPool;
}

export interface Run {
  id: string;
  parent_id: string | null;
  session_id: string | null;
  project: string;
  name: string;
  run_type: "llm" | "chain" | "tool" | "retriever";
  inputs: Record<string, unknown> | null;
  outputs: Record<string, unknown> | null;
  error: string | null;
  start_time: string;
  end_time: string | null;
  latency_ms: number | null;
  tags: string[];
  extra: Record<string, unknown> | null;
  branch_decision: string | null;
  total_cost_usd: number | null;
}

export interface RunFilters {
  project?: string;
  run_type?: string;
  tag?: string;
  error_only?: boolean;
  from?: string;
  to?: string;
}

export interface TrendPoint {
  bucket: string;
  p50: number;
  p95: number;
  count: number;
}

export interface PathRow {
  path: string;
  frequency: number;
  session_ids: string[];
}

export async function getRootSpans(filters: RunFilters = {}): Promise<Run[]> {
  const pool = getPool();
  const { project, run_type, tag, error_only, from, to } = filters;

  const conditions: string[] = ["r.parent_id IS NULL"];
  const params: unknown[] = [];
  let i = 1;

  if (project)     { conditions.push(`r.project = $${i++}`);            params.push(project); }
  if (run_type)    { conditions.push(`r.run_type = $${i++}`);           params.push(run_type); }
  if (tag)         { conditions.push(`$${i++} = ANY(r.tags)`);          params.push(tag); }
  if (error_only)  { conditions.push(`r.error IS NOT NULL`); }
  if (from)        { conditions.push(`r.start_time >= $${i++}::timestamptz`); params.push(from); }
  if (to)          { conditions.push(`r.start_time < $${i++}::timestamptz`);  params.push(to); }

  const where = conditions.join(" AND ");

  const { rows } = await pool.query<Run>(
    `SELECT r.*,
       (
         SELECT COALESCE(SUM((r2.extra->>'cost_usd')::numeric), 0)
         FROM runs r2
         WHERE r2.session_id = r.session_id AND r.session_id IS NOT NULL
       ) AS total_cost_usd
     FROM runs r
     WHERE ${where}
     ORDER BY r.start_time DESC
     LIMIT 200`,
    params,
  );
  return rows;
}

export async function getTraceTree(rootId: string): Promise<Run[]> {
  const pool = getPool();
  const { rows } = await pool.query<Run>(
    `WITH RECURSIVE trace AS (
       SELECT * FROM runs WHERE id = $1
       UNION ALL
       SELECT r.* FROM runs r JOIN trace t ON r.parent_id = t.id
     )
     SELECT * FROM trace ORDER BY start_time`,
    [rootId]
  );
  return rows;
}

export async function getPathFrequency(
  project: string,
  from?: string,
  to?: string,
): Promise<PathRow[]> {
  const pool = getPool();
  const { rows } = await pool.query<PathRow>(
    `WITH ordered_spans AS (
       SELECT
         session_id,
         name,
         branch_decision,
         start_time,
         ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY start_time) AS step_order
       FROM runs
       WHERE project = $1
         AND session_id IS NOT NULL
         AND ($2::timestamptz IS NULL OR start_time >= $2::timestamptz)
         AND ($3::timestamptz IS NULL OR start_time < $3::timestamptz)
     ),
     paths AS (
       SELECT
         session_id,
         STRING_AGG(
           name || COALESCE(':' || branch_decision, ''),
           ' → ' ORDER BY step_order
         ) AS path
       FROM ordered_spans
       GROUP BY session_id
     )
     SELECT path, COUNT(*)::int AS frequency, ARRAY_AGG(session_id::text) AS session_ids
     FROM paths
     GROUP BY path
     ORDER BY frequency DESC`,
    [project, from ?? null, to ?? null],
  );
  return rows;
}

export async function getLatencyTrend(project?: string): Promise<TrendPoint[]> {
  const pool = getPool();
  const { rows } = await pool.query<TrendPoint>(
    `SELECT
       DATE_TRUNC('hour', start_time) AS bucket,
       PERCENTILE_CONT(0.5)  WITHIN GROUP (ORDER BY latency_ms)::int AS p50,
       PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms)::int AS p95,
       COUNT(*)::int AS count
     FROM runs
     WHERE parent_id IS NULL
       AND latency_ms IS NOT NULL
       AND ($1::text IS NULL OR project = $1)
       AND start_time >= NOW() - INTERVAL '7 days'
     GROUP BY bucket
     ORDER BY bucket`,
    [project ?? null],
  );
  return rows;
}

export async function getProjects(): Promise<string[]> {
  const pool = getPool();
  const { rows } = await pool.query<{ project: string }>(
    `SELECT DISTINCT project FROM runs ORDER BY project`
  );
  return rows.map((r) => r.project);
}

export interface NodeCostRow {
  project: string;
  name: string;
  run_type: string;
  call_count: number;
  total_cost: number;
  avg_cost: number;
  pct_of_total: number;
}

export interface SessionCostRow {
  session_id: string;
  project: string;
  started_at: string;
  total_cost: number;
  span_count: number;
}

export interface DailyCostPoint {
  bucket: string;
  project: string;
  total_cost: number;
  span_count: number;
}

export async function getNodeCostBreakdown(
  project: string,
  from?: string,
  to?: string,
): Promise<NodeCostRow[]> {
  const pool = getPool();
  const { rows } = await pool.query<NodeCostRow>(
    `WITH node_costs AS (
       SELECT
         project,
         name,
         run_type,
         COUNT(*)::int                                        AS call_count,
         COALESCE(SUM((extra->>'cost_usd')::numeric), 0)     AS total_cost,
         COALESCE(AVG((extra->>'cost_usd')::numeric), 0)     AS avg_cost
       FROM runs
       WHERE project = $1
         AND ($2::timestamptz IS NULL OR start_time >= $2)
         AND ($3::timestamptz IS NULL OR start_time <  $3)
       GROUP BY project, name, run_type
     ),
     project_total AS (
       SELECT COALESCE(SUM(total_cost), 0) AS grand_total FROM node_costs
     )
     SELECT
       nc.project,
       nc.name,
       nc.run_type,
       nc.call_count,
       nc.total_cost,
       nc.avg_cost,
       ROUND(
         CASE WHEN pt.grand_total > 0
              THEN (nc.total_cost / pt.grand_total * 100)
              ELSE 0
         END, 2
       ) AS pct_of_total
     FROM node_costs nc
     CROSS JOIN project_total pt
     ORDER BY nc.total_cost DESC`,
    [project, from ?? null, to ?? null],
  );
  return rows;
}

export async function getSessionCostRollup(
  project: string,
  from?: string,
  to?: string,
): Promise<SessionCostRow[]> {
  const pool = getPool();
  const { rows } = await pool.query<SessionCostRow>(
    `SELECT
       session_id::text,
       project,
       MIN(start_time)                                       AS started_at,
       COALESCE(SUM((extra->>'cost_usd')::numeric), 0)      AS total_cost,
       COUNT(*)::int                                         AS span_count
     FROM runs
     WHERE session_id IS NOT NULL
       AND project = $1
       AND ($2::timestamptz IS NULL OR start_time >= $2)
       AND ($3::timestamptz IS NULL OR start_time <  $3)
     GROUP BY session_id, project
     ORDER BY started_at DESC
     LIMIT 200`,
    [project, from ?? null, to ?? null],
  );
  return rows;
}

export async function getDailyCostTrend(
  project?: string,
  from?: string,
  to?: string,
): Promise<DailyCostPoint[]> {
  const pool = getPool();
  const { rows } = await pool.query<DailyCostPoint>(
    `SELECT
       DATE_TRUNC('day', start_time)                         AS bucket,
       project,
       COALESCE(SUM((extra->>'cost_usd')::numeric), 0)      AS total_cost,
       COUNT(*)::int                                         AS span_count
     FROM runs
     WHERE ($1::text IS NULL OR project = $1)
       AND ($2::timestamptz IS NULL OR start_time >= $2)
       AND ($3::timestamptz IS NULL OR start_time <  $3)
     GROUP BY DATE_TRUNC('day', start_time), project
     ORDER BY bucket`,
    [project ?? null, from ?? null, to ?? null],
  );
  return rows;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  run_count: number;
}

export async function getProjectsList(): Promise<Project[]> {
  const pool = getPool();
  const { rows } = await pool.query<Project>(
    `SELECT p.id, p.name, p.description, p.created_at,
            COUNT(DISTINCT r.id)::int AS run_count
     FROM projects p
     LEFT JOIN runs r ON r.project = p.name
     GROUP BY p.id
     ORDER BY p.created_at DESC`
  );
  return rows;
}

export async function createProject(
  name: string,
  description?: string,
): Promise<Project> {
  const pool = getPool();
  const { rows } = await pool.query<Project>(
    `INSERT INTO projects (name, description)
     VALUES ($1, $2)
     RETURNING id, name, description, created_at, 0 AS run_count`,
    [name, description ?? null],
  );
  return rows[0];
}

export async function getRun(id: string): Promise<Run | null> {
  const pool = getPool();
  const { rows } = await pool.query<Run>(`SELECT * FROM runs WHERE id = $1`, [
    id,
  ]);
  return rows[0] ?? null;
}
