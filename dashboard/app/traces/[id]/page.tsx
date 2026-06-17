import Link from "next/link";
import { notFound } from "next/navigation";
import { getRun, getTraceTree } from "@/lib/db";
import { TraceTree } from "@/components/TraceTree";

export const dynamic = "force-dynamic";

export default async function TraceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [root, spans] = await Promise.all([getRun(id), getTraceTree(id)]);

  if (!root) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/traces"
          className="text-sm text-indigo-600 hover:underline"
        >
          ← Traces
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">{root.name}</h1>
        <span className="ml-auto text-sm text-gray-500">
          {new Date(root.start_time).toLocaleString()}
        </span>
      </div>

      <div className="mb-6 flex gap-6 rounded-lg border border-gray-200 bg-white px-6 py-4 text-sm">
        <div>
          <p className="text-gray-500">Project</p>
          <p className="font-medium">{root.project}</p>
        </div>
        <div>
          <p className="text-gray-500">Spans</p>
          <p className="font-medium">{spans.length}</p>
        </div>
        {root.latency_ms != null && (
          <div>
            <p className="text-gray-500">Total latency</p>
            <p className="font-medium">{root.latency_ms} ms</p>
          </div>
        )}
        {root.error && (
          <div>
            <p className="text-gray-500">Status</p>
            <p className="font-medium text-red-600">Failed</p>
          </div>
        )}
      </div>

      <TraceTree spans={spans} />
    </div>
  );
}
