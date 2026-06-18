import { type NextRequest } from "next/server";
import { getLatencyTrend } from "@/lib/db";

export async function GET(request: NextRequest) {
  const project = request.nextUrl.searchParams.get("project") ?? undefined;
  try {
    const rows = await getLatencyTrend(project);
    return Response.json(rows);
  } catch (err) {
    console.error("GET /api/runs/trend failed", err);
    return Response.json({ error: "Database error" }, { status: 500 });
  }
}
