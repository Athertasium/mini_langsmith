import { type NextRequest } from "next/server";
import { getDailyCostTrend, validateProjectOwner } from "@/lib/db";
import { getRequestUser } from "@/lib/session";

export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const project = params.get("project") ?? undefined;
  const from = params.get("from") ?? undefined;
  const to = params.get("to") ?? undefined;

  if (project) {
    const owns = await validateProjectOwner(project, user.id);
    if (!owns) return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const rows = await getDailyCostTrend(project, from, to, user.id);
    return Response.json(rows);
  } catch (err) {
    console.error("GET /api/cost/trend failed", err);
    return Response.json({ error: "Database error" }, { status: 500 });
  }
}
