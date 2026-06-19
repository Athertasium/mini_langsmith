import { CostTrendChart } from "@/components/CostTrendChart";
import { NodeCostTable } from "@/components/NodeCostTable";
import { SessionCostList } from "@/components/SessionCostList";
import { getProjects } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export default async function CostPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; from?: string; to?: string }>;
}) {
  const projects = await getProjects();
  const { project = projects[0] ?? "", from, to } = await searchParams;
  const resolvedFrom = from ?? daysAgo(7);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Cost Attribution
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            Spend breakdown by node, session, and day — so you know exactly where tokens go.
          </p>
        </div>

        {/* Project selector */}
        <div className="flex gap-2">
          {projects.map((p) => (
            <Link
              key={p}
              href={`/cost?project=${p}${from ? `&from=${from}` : ""}${to ? `&to=${to}` : ""}`}
              className="rounded px-3 py-1.5 text-sm font-medium transition-colors"
              style={
                project === p
                  ? { background: "var(--accent)", color: "#fff" }
                  : { background: "var(--surface-2)", color: "var(--text-secondary)" }
              }
            >
              {p}
            </Link>
          ))}
        </div>
      </div>

      {/* Date range quick-selects */}
      <div className="mb-6 flex gap-2 text-sm">
        {[
          { label: "Last 7 days", days: 7 },
          { label: "Last 30 days", days: 30 },
          { label: "All time", days: null },
        ].map(({ label, days }) => {
          const f = days ? daysAgo(days) : undefined;
          const href = `/cost?project=${project}${f ? `&from=${f}` : ""}`;
          const active =
            days === null
              ? !from
              : resolvedFrom.startsWith(f?.slice(0, 10) ?? "");
          return (
            <Link
              key={label}
              href={href}
              className="rounded px-3 py-1.5 transition-colors"
              style={
                active
                  ? {
                      background: "var(--surface-2)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--border)",
                    }
                  : { color: "var(--text-secondary)" }
              }
            >
              {label}
            </Link>
          );
        })}
      </div>

      {/* Daily spend trend */}
      <div className="mb-6">
        <CostTrendChart project={project} from={resolvedFrom} to={to} />
      </div>

      {/* Node breakdown + Session list side by side */}
      <div className="grid gap-6 lg:grid-cols-2">
        <NodeCostTable project={project} from={resolvedFrom} to={to} />
        <SessionCostList project={project} from={resolvedFrom} to={to} />
      </div>
    </div>
  );
}
