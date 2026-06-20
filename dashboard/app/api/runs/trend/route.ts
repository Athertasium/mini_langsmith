import { type NextRequest } from "next/server";
import { getLatencyTrend, validateProjectOwner } from "@/lib/db";
import { getRequestUser } from "@/lib/session";

export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const project = request.nextUrl.searchParams.get("project") ?? undefined;

  if (project) {
    const owns = await validateProjectOwner(project, user.id);
    if (!owns) return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const rows = await getLatencyTrend(project, user.id);
    return Response.json(rows);
  } catch (err) {
    console.error("GET /api/runs/trend failed", err);
    return Response.json({ error: "Database error" }, { status: 500 });
  }
}
