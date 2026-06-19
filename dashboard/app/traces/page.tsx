import { getRootSpans } from "@/lib/db";
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
  const sp = await searchParams;
  const project    = sp.project    ?? undefined;
  if (!project) redirect("/projects");
  const run_type   = sp.run_type   ?? undefined;
  const tag        = sp.tag        ?? undefined;
  const error_only = sp.error_only === "1";
  const from       = sp.from       ?? undefined;
  const to         = sp.to         ?? undefined;

  const runs = await getRootSpans({ project, run_type, tag, error_only, from, to });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <ProjectSubNav project={project} active="traces" />
      <h1 className="mb-4 text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
        Traces — {project}
      </h1>

      {/* Filter bar */}
      <div
        className="mb-4 rounded-lg px-4 py-3"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <Suspense fallback={null}>
          <FilterBar />
        </Suspense>
      </div>

      {/* Latency trend */}
      <div className="mb-6">
        <LatencyChart project={project} />
      </div>

      {/* Result count */}
      <p className="mb-2 text-xs" style={{ color: "var(--text-secondary)" }}>
        {runs.length} trace{runs.length !== 1 ? "s" : ""}
      </p>

      <TraceTable data={runs} />
    </div>
  );
}
