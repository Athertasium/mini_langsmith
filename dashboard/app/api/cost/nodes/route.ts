import { type NextRequest } from "next/server";
import { getNodeCostBreakdown, validateProjectOwner } from "@/lib/db";
import { getRequestUser } from "@/lib/session";

export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const project = params.get("project");
  const from = params.get("from") ?? undefined;
  const to = params.get("to") ?? undefined;

  if (!project) {
    return Response.json({ error: "project is required" }, { status: 400 });
  }

  const owns = await validateProjectOwner(project, user.id);
  if (!owns) return Response.json({ error: "Forbidden" }, { status: 403 });

  try {
    const rows = await getNodeCostBreakdown(project, from, to);
    return Response.json(rows);
  } catch (err) {
    console.error("GET /api/cost/nodes failed", err);
    return Response.json({ error: "Database error" }, { status: 500 });
  }
}
