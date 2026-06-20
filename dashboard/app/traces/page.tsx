import { getRootSpans, getLatencyTrend, validateProjectOwner } from "@/lib/db";
import { getServerUser } from "@/lib/session";
import { TraceTable } from "@/components/TraceTable";
import { LatencyChart } from "@/components/LatencyChart";
import { FilterBar } from "@/components/FilterBar";
import { ProjectSubNav } from "@/components/ProjectSubNav";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function TracesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await getServerUser();
  if (!user) redirect("/signin");

  const sp = await searchParams;
  const project    = sp.project    ?? undefined;
  if (!project) redirect("/projects");

  const owns = await validateProjectOwner(project, user.id);
  if (!owns) redirect("/projects");
  const run_type   = sp.run_type   ?? undefined;
  const tag        = sp.tag        ?? undefined;
  const error_only = sp.error_only === "1";
  const from       = sp.from       ?? undefined;
  const to         = sp.to         ?? undefined;

  const [runs, trendData] = await Promise.all([
    getRootSpans({ project, run_type, tag, error_only, from, to }),
    getLatencyTrend(project, user.id),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <ProjectSubNav project={project} active="traces" />

      {/* Page title + count */}
      <div className="mb-5 flex items-baseline gap-3">
        <h1
          className="text-xl font-semibold"
          style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}
        >
          Traces
        </h1>
        <span
          className="rounded px-2 py-0.5 text-xs font-medium tabular-nums"
          style={{
            background: "var(--surface-high)",
            color: "var(--text-muted)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {runs.length}
        </span>
      </div>

      {/* Filter bar */}
      <div
        className="mb-5 rounded-lg px-4 py-3"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <Suspense fallback={null}>
          <FilterBar />
        </Suspense>
      </div>

      {/* Latency trend */}
      <div className="mb-5">
        <LatencyChart project={project} initialData={trendData} />
      </div>

      <TraceTable data={runs} />
    </div>
  );
}
