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
}

export interface PathRow {
  path: string;
  frequency: number;
  session_ids: string[];
}

export async function getRootSpans(project?: string): Promise<Run[]> {
  const pool = getPool();
  if (project) {
    const { rows } = await pool.query<Run>(
      `SELECT * FROM runs WHERE parent_id IS NULL AND project = $1 ORDER BY start_time DESC LIMIT 200`,
      [project]
    );
    return rows;
  }
  const { rows } = await pool.query<Run>(
    `SELECT * FROM runs WHERE parent_id IS NULL ORDER BY start_time DESC LIMIT 200`
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
         AND run_type = 'chain'
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

export async function getRun(id: string): Promise<Run | null> {
  const pool = getPool();
  const { rows } = await pool.query<Run>(`SELECT * FROM runs WHERE id = $1`, [
    id,
  ]);
  return rows[0] ?? null;
}
