import { getRootSpans } from "@/lib/db";
import { TraceTable } from "@/components/TraceTable";
import { LatencyChart } from "@/components/LatencyChart";
import Link from "next/link";

export const dynamic = "force-dynamic";

const PROJECTS = ["doclens", "echonote"];

export default async function TracesPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const { project } = await searchParams;
  const runs = await getRootSpans(project);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Traces
        </h1>
        <div className="flex gap-2">
          <Link
            href="/traces"
            className="rounded px-3 py-1.5 text-sm font-medium transition-colors"
            style={
              !project
                ? { background: "var(--accent)", color: "#fff" }
                : { background: "var(--surface-2)", color: "var(--text-secondary)" }
            }
          >
            All
          </Link>
          {PROJECTS.map((p) => (
            <Link
              key={p}
              href={`/traces?project=${p}`}
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

      <div className="mb-6">
        <LatencyChart runs={runs} />
      </div>

      <TraceTable data={runs} />
    </div>
  );
}
