import { type NextRequest } from "next/server";
import { getRootSpans } from "@/lib/db";

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  try {
    const runs = await getRootSpans({
      project:    p.get("project")    ?? undefined,
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
