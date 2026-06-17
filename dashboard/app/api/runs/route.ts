import { type NextRequest } from "next/server";
import { getRootSpans } from "@/lib/db";

export async function GET(request: NextRequest) {
  const project = request.nextUrl.searchParams.get("project") ?? undefined;
  try {
    const runs = await getRootSpans(project);
    return Response.json(runs);
  } catch (err) {
    console.error("GET /api/runs failed", err);
    return Response.json({ error: "Database error" }, { status: 500 });
  }
}
