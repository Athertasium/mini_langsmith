import { type NextRequest } from "next/server";
import { getTraceTree, getRun, validateProjectOwner } from "@/lib/db";
import { getRequestUser } from "@/lib/session";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getRequestUser(req);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const run = await getRun(id);
  if (!run) return Response.json({ error: "Not found" }, { status: 404 });

  const owns = await validateProjectOwner(run.project, user.id);
  if (!owns) return Response.json({ error: "Forbidden" }, { status: 403 });

  try {
    const tree = await getTraceTree(id);
    return Response.json(tree);
  } catch (err) {
    console.error("GET /api/runs/[id]/tree failed", err);
    return Response.json({ error: "Database error" }, { status: 500 });
  }
}
