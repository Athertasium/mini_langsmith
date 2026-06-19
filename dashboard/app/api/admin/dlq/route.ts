import { type NextRequest } from "next/server";
import { getRedis, type DlqEntry } from "@/lib/redis";

const DEADLETTER_KEY = "runs:deadletter";
const PENDING_KEY = "runs:pending";
const PAGE_SIZE = 20;

export async function GET() {
  try {
    const redis = getRedis();
    const raw = await redis.lrange(DEADLETTER_KEY, 0, PAGE_SIZE - 1);
    const entries: DlqEntry[] = raw.map((item) => {
      try {
        const parsed = JSON.parse(item) as Record<string, unknown>;
        // New format: {payload, error, failed_at}
        if (parsed.payload && typeof parsed.payload === "object") {
          return parsed as unknown as DlqEntry;
        }
        // Old format: raw span payload
        return { payload: parsed, error: null, failed_at: "" };
      } catch {
        return { payload: { _raw: item }, error: null, failed_at: "" };
      }
    });
    const total = await redis.llen(DEADLETTER_KEY);
    return Response.json({ entries, total });
  } catch (err) {
    console.error("GET /api/admin/dlq failed", err);
    return Response.json({ error: "Redis error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { index } = (await request.json()) as { index: number };
    const redis = getRedis();

    const raw = await redis.lindex(DEADLETTER_KEY, index);
    if (!raw) {
      return Response.json({ error: "Entry not found" }, { status: 404 });
    }

    const entry = JSON.parse(raw) as DlqEntry;
    await redis.rpush(PENDING_KEY, JSON.stringify(entry.payload));
    await redis.lrem(DEADLETTER_KEY, 1, raw);

    return Response.json({ ok: true });
  } catch (err) {
    console.error("POST /api/admin/dlq failed", err);
    return Response.json({ error: "Redis error" }, { status: 500 });
  }
}
