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
        <h1 className="text-2xl font-bold text-gray-900">Traces</h1>
        <div className="flex gap-2">
          <Link
            href="/traces"
            className={`rounded px-3 py-1.5 text-sm font-medium ${!project ? "bg-indigo-600 text-black" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
          >
            All
          </Link>
          {PROJECTS.map((p) => (
            <Link
              key={p}
              href={`/traces?project=${p}`}
              className={`rounded px-3 py-1.5 text-sm font-medium ${project === p ? "bg-indigo-600 text-black" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
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
