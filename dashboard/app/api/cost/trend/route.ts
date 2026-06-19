import { type NextRequest } from "next/server";
import { getDailyCostTrend } from "@/lib/db";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const project = params.get("project") ?? undefined;
  const from = params.get("from") ?? undefined;
  const to = params.get("to") ?? undefined;

  try {
    const rows = await getDailyCostTrend(project, from, to);
    return Response.json(rows);
  } catch (err) {
    console.error("GET /api/cost/trend failed", err);
    return Response.json({ error: "Database error" }, { status: 500 });
  }
}
