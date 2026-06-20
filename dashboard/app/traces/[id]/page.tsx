import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getRun, getTraceTree, validateProjectOwner } from "@/lib/db";
import { getServerUser } from "@/lib/session";
import { TraceTree } from "@/components/TraceTree";

export const dynamic = "force-dynamic";

function MetaStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p
        className="mb-1 text-xs font-medium uppercase tracking-wider"
        style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}
      >
        {label}
      </p>
      <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
        {value}
      </div>
    </div>
  );
}

export default async function TraceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getServerUser();
  if (!user) redirect("/signin");

  const { id } = await params;
  const [root, spans] = await Promise.all([getRun(id), getTraceTree(id)]);

  if (!root) notFound();

  const owns = await validateProjectOwner(root.project, user.id);
  if (!owns) notFound();

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 mb-5 text-xs" style={{ color: "var(--text-muted)" }}>
        <Link href="/projects" className="transition-colors hover:text-white" style={{ color: "var(--text-muted)" }}>
          Projects
        </Link>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" style={{ opacity: 0.4 }}>
          <path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <Link
          href={`/traces?project=${encodeURIComponent(root.project)}`}
          className="transition-colors hover:text-white"
          style={{ color: "var(--text-muted)" }}
        >
          {root.project}
        </Link>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" style={{ opacity: 0.4 }}>
          <path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span style={{ color: "var(--text-secondary)" }} className="truncate max-w-xs">
          {root.name}
        </span>
      </div>

      {/* Trace name + time */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <h1
          className="text-xl font-semibold"
          style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}
        >
          {root.name}
        </h1>
        <span
          className="shrink-0 text-xs tabular-nums"
          style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", paddingTop: 3 }}
        >
          {new Date(root.start_time).toLocaleString()}
        </span>
      </div>

      {/* Meta stats bar */}
      <div
        className="mb-6 flex flex-wrap gap-6 rounded-lg px-6 py-4"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <MetaStat label="Project" value={root.project} />
        <MetaStat
          label="Spans"
          value={
            <span style={{ fontFamily: "var(--font-mono)" }}>{spans.length}</span>
          }
        />
        {root.latency_ms != null && (
          <MetaStat
            label="Latency"
            value={
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent-hover)" }}>
                {root.latency_ms} ms
              </span>
            }
          />
        )}
        <MetaStat
          label="Status"
          value={
            root.error ? (
              <span
                className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium"
                style={{ background: "var(--error-dim)", color: "var(--error-color)" }}
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: "var(--error-color)" }} />
                FAILED
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium"
                style={{ background: "var(--success-dim)", color: "var(--success)" }}
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: "var(--success)" }} />
                OK
              </span>
            )
          }
        />
      </div>

      <TraceTree spans={spans} project={root.project} />
    </div>
  );
}
