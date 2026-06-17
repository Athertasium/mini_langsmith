import { getTraceTree } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const tree = await getTraceTree(id);
    return Response.json(tree);
  } catch (err) {
    console.error("GET /api/runs/[id]/tree failed", err);
    return Response.json({ error: "Database error" }, { status: 500 });
  }
}
