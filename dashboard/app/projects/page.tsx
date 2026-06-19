import { getProjectsList } from "@/lib/db";
import { CreateProjectForm } from "@/components/CreateProjectForm";
import Link from "next/link";

export const dynamic = "force-dynamic";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function ProjectsPage() {
  const projects = await getProjectsList();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
          Projects
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Each project groups traces from one application. Click a project to view its traces.
        </p>
      </div>

      {/* Create form */}
      <div
        className="mb-8 rounded-lg px-5 py-4"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <p className="mb-3 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
          New project
        </p>
        <CreateProjectForm />
      </div>

      {/* Project list */}
      {projects.length === 0 ? (
        <div
          className="rounded-lg px-6 py-12 text-center"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            No projects yet. Create one above to start collecting traces.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/traces?project=${encodeURIComponent(p.name)}`}
              className="group block rounded-lg px-5 py-4 transition-colors"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="mb-2 flex items-center justify-between">
                <span
                  className="font-semibold transition-colors group-hover:text-indigo-400"
                  style={{ color: "var(--text-primary)" }}
                >
                  {p.name}
                </span>
                <span
                  className="rounded px-2 py-0.5 text-xs font-medium"
                  style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}
                >
                  {p.run_count} run{p.run_count !== 1 ? "s" : ""}
                </span>
              </div>
              {p.description && (
                <p className="mb-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                  {p.description}
                </p>
              )}
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                Created {formatDate(p.created_at)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
