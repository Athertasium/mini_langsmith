import { type NextRequest } from "next/server";
import { getProjectsList, createProject } from "@/lib/db";

export async function GET() {
  try {
    const projects = await getProjectsList();
    return Response.json(projects);
  } catch (err) {
    console.error("GET /api/projects failed", err);
    return Response.json({ error: "Database error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { name?: string; description?: string };
    const name = (body.name ?? "").trim();
    if (!name) {
      return Response.json({ error: "name is required" }, { status: 400 });
    }
    const project = await createProject(name, body.description?.trim() || undefined);
    return Response.json(project, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return Response.json({ error: "Project name already exists" }, { status: 409 });
    }
    console.error("POST /api/projects failed", err);
    return Response.json({ error: "Database error" }, { status: 500 });
  }
}
