import { type NextRequest } from "next/server";
import { getSessionCostRollup } from "@/lib/db";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const project = params.get("project");
  const from = params.get("from") ?? undefined;
  const to = params.get("to") ?? undefined;

  if (!project) {
    return Response.json({ error: "project is required" }, { status: 400 });
  }

  try {
    const rows = await getSessionCostRollup(project, from, to);
    return Response.json(rows);
  } catch (err) {
    console.error("GET /api/cost/sessions failed", err);
    return Response.json({ error: "Database error" }, { status: 500 });
  }
}
