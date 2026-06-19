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
          href={`/traces?project=${encodeURIComponent(root.project)}`}
          className="text-sm hover:underline"
          style={{ color: "var(--accent)" }}
        >
          ← {root.project}
        </Link>
        <span style={{ color: "var(--border)" }}>/</span>
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
          {root.name}
        </h1>
        <span className="ml-auto text-sm" style={{ color: "var(--text-secondary)" }}>
          {new Date(root.start_time).toLocaleString()}
        </span>
      </div>

      <div
        className="mb-6 flex gap-6 rounded-lg px-6 py-4 text-sm"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div>
          <p className="mb-1 text-xs uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Project</p>
          <p className="font-medium" style={{ color: "var(--text-primary)" }}>{root.project}</p>
        </div>
        <div>
          <p className="mb-1 text-xs uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Spans</p>
          <p className="font-medium" style={{ color: "var(--text-primary)" }}>{spans.length}</p>
        </div>
        {root.latency_ms != null && (
          <div>
            <p className="mb-1 text-xs uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Latency</p>
            <p className="font-medium" style={{ color: "var(--text-primary)" }}>{root.latency_ms} ms</p>
          </div>
        )}
        <div>
          <p className="mb-1 text-xs uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Status</p>
          {root.error ? (
            <span className="rounded px-2 py-0.5 text-xs font-bold" style={{ background: "#3f1515", color: "#f87171" }}>
              FAILED
            </span>
          ) : (
            <span className="rounded px-2 py-0.5 text-xs font-bold" style={{ background: "#0f2a1a", color: "#4ade80" }}>
              OK
            </span>
          )}
        </div>
      </div>

      <TraceTree spans={spans} project={root.project} />
    </div>
  );
}
