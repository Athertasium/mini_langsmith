import { SankeyDiagram } from "@/components/SankeyDiagram";
import { ProjectSubNav } from "@/components/ProjectSubNav";
import { validateProjectOwner } from "@/lib/db";
import { getServerUser } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

function sevenDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString();
}

export default async function PathsPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; from?: string; to?: string }>;
}) {
  const user = await getServerUser();
  if (!user) redirect("/signin");

  const { project = "", from, to } = await searchParams;
  if (!project) redirect("/projects");

  const owns = await validateProjectOwner(project, user.id);
  if (!owns) redirect("/projects");
  const resolvedFrom = from ?? sevenDaysAgo();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <ProjectSubNav project={project} active="paths" />
      <div className="mb-6">
        <h1
          className="text-xl font-semibold"
          style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}
        >
          Routing Paths
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Node sequences that fire across traces — and how often.
        </p>
      </div>

      {/* Date range quick-selects */}
      <div className="mb-6 flex gap-1">
        {[
          { label: "Last 7 days", days: 7 },
          { label: "Last 30 days", days: 30 },
          { label: "All time", days: null },
        ].map(({ label, days }) => {
          const f = days
            ? new Date(Date.now() - days * 86400_000).toISOString()
            : undefined;
          const href = `/paths?project=${encodeURIComponent(project)}${f ? `&from=${f}` : ""}`;
          const active = days === null ? !from : resolvedFrom.startsWith(f?.slice(0, 10) ?? "");
          return (
            <Link
              key={label}
              href={href}
              className="rounded px-3 py-1.5 text-xs font-medium transition-all duration-150"
              style={
                active
                  ? {
                      background: "var(--accent-dim)",
                      color: "var(--accent-hover)",
                      border: "1px solid rgba(99, 102, 241, 0.35)",
                    }
                  : {
                      color: "var(--text-muted)",
                      border: "1px solid transparent",
                    }
              }
            >
              {label}
            </Link>
          );
        })}
      </div>

      {/* Sankey diagram — client component */}
      <div
        className="rounded-lg p-4"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <SankeyDiagram project={project} from={resolvedFrom} to={to} />
      </div>

      <p className="mt-4 text-xs" style={{ color: "var(--text-secondary)" }}>
        Stream width ∝ trace frequency. Hover a link to see count and jump to matching traces.
        Node labels show <code>name</code> (top) and <code>:branch_decision</code> (bottom) when present.
      </p>
    </div>
  );
}
