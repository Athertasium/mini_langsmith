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

export async function getRun(id: string): Promise<Run | null> {
  const pool = getPool();
  const { rows } = await pool.query<Run>(`SELECT * FROM runs WHERE id = $1`, [
    id,
  ]);
  return rows[0] ?? null;
}
