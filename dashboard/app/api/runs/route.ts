import { type NextRequest } from "next/server";
import { getRootSpans, validateProjectOwner } from "@/lib/db";
import { getRequestUser } from "@/lib/session";

export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const p = request.nextUrl.searchParams;
  const project = p.get("project") ?? undefined;

  if (project) {
    const owns = await validateProjectOwner(project, user.id);
    if (!owns) return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const runs = await getRootSpans({
      project,
      run_type:   p.get("run_type")   ?? undefined,
      tag:        p.get("tag")        ?? undefined,
      error_only: p.get("error_only") === "1",
      from:       p.get("from")       ?? undefined,
      to:         p.get("to")         ?? undefined,
    });
    return Response.json(runs);
  } catch (err) {
    console.error("GET /api/runs failed", err);
    return Response.json({ error: "Database error" }, { status: 500 });
  }
}
