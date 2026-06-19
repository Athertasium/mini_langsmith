import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

function getPool(): Pool {
  if (!global._pgPool) {
    global._pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return global._pgPool;
}

export interface SparklinePoint {
  latency_ms: number;
  start_time: string;
}

export interface SparklineResponse {
  name: string;
  data: SparklinePoint[];
}

// GET /api/runs/sparkline?project=x&names[]=a&names[]=b
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const project = searchParams.get("project");
  const names = searchParams.getAll("names[]");

  if (!project) {
    return NextResponse.json({ error: "project required" }, { status: 400 });
  }
  if (names.length === 0) {
    return NextResponse.json({ error: "names[] required" }, { status: 400 });
  }

  const pool = getPool();

  // Batch query: fetch last 50 latency_ms per (project, name) in one round-trip
  const { rows } = await pool.query<{ name: string; latency_ms: number; start_time: string }>(
    `SELECT name, latency_ms, start_time
     FROM (
       SELECT name, latency_ms, start_time,
              ROW_NUMBER() OVER (PARTITION BY name ORDER BY start_time DESC) AS rn
       FROM runs
       WHERE project = $1
         AND name = ANY($2::text[])
         AND latency_ms IS NOT NULL
     ) sub
     WHERE rn <= 50
     ORDER BY name, start_time DESC`,
    [project, names]
  );

  // Group by name
  const grouped = new Map<string, SparklinePoint[]>();
  for (const row of rows) {
    if (!grouped.has(row.name)) grouped.set(row.name, []);
    grouped.get(row.name)!.push({ latency_ms: row.latency_ms, start_time: row.start_time });
  }

  const result: SparklineResponse[] = names.map((name) => ({
    name,
    data: grouped.get(name) ?? [],
  }));

  return NextResponse.json(result);
}
