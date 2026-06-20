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

function shortId(uuid: string): string {
  return `prj_${uuid.replace(/-/g, "").slice(0, 7)}`;
}

function RunCountBar({ count }: { count: number }) {
  const max = 1_000_000;
  const pct = Math.min((count / max) * 100, 100);
  return (
    <div className="mt-2" style={{ height: 3, background: "var(--surface-high)", borderRadius: 99, overflow: "hidden" }}>
      <div
        style={{
          height: "100%",
          width: `${Math.max(pct, 2)}%`,
          background: "var(--accent)",
          borderRadius: 99,
          opacity: 0.7,
        }}
      />
    </div>
  );
}

export default async function ProjectsPage() {
  const projects = await getProjectsList();

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      {/* Header */}
      <div className="mb-7 flex items-end justify-between">
        <div>
          <h1
            className="text-xl font-semibold"
            style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}
          >
            Projects
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            Observability workspaces — each groups traces from one application.
          </p>
        </div>
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums"
          style={{
            background: "var(--surface-high)",
            color: "var(--text-muted)",
            border: "1px solid var(--border)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {projects.length} project{projects.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Project grid */}
      {projects.length === 0 ? (
        <div
          className="rounded-xl px-6 py-20 text-center mb-6"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div
            className="mx-auto mb-4 w-11 h-11 rounded-full flex items-center justify-center"
            style={{ background: "var(--surface-high)" }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
              <rect x="2" y="2" width="14" height="14" rx="2" stroke="var(--text-muted)" strokeWidth="1.5" />
              <path d="M9 6V12M6 9H12" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            No projects yet
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
            Create a project below to start collecting traces.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/traces?project=${encodeURIComponent(p.name)}`}
              className="project-card group block rounded-xl px-5 py-4"
            >
              {/* ID badge */}
              <div className="mb-3 flex items-center gap-2">
                <span
                  className="rounded px-1.5 py-0.5 text-[10px] font-medium tabular-nums"
                  style={{
                    background: "var(--bg-deep)",
                    color: "var(--text-muted)",
                    border: "1px solid var(--border)",
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.02em",
                  }}
                >
                  {shortId(p.id)}
                </span>
                <span
                  className="ml-auto w-2 h-2 rounded-full shrink-0"
                  style={{ background: "var(--success)", opacity: 0.8 }}
                  title="Active"
                />
              </div>

              {/* Name */}
              <p
                className="font-semibold text-sm leading-tight mb-1"
                style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}
              >
                {p.name}
              </p>

              {/* Description */}
              {p.description && (
                <p
                  className="text-xs leading-relaxed mb-3 line-clamp-2"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {p.description}
                </p>
              )}

              {/* Run count */}
              <div className="mt-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Total runs
                  </span>
                  <span
                    className="text-xs font-semibold tabular-nums"
                    style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}
                  >
                    {p.run_count.toLocaleString()}
                  </span>
                </div>
                <RunCountBar count={p.run_count} />
              </div>

              {/* Footer */}
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {formatDate(p.created_at)}
                </p>
                <span
                  className="project-card-cta text-xs font-medium"
                  style={{ color: "var(--accent-hover)", opacity: 0, transition: "opacity 150ms" }}
                >
                  View traces →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create form */}
      <div
        className="rounded-xl px-5 py-5"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <rect x="1" y="1" width="12" height="12" rx="2" stroke="var(--text-muted)" strokeWidth="1.4" />
            <path d="M7 4.5V9.5M4.5 7H9.5" stroke="var(--text-muted)" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", opacity: 0.7 }}>
            New project
          </p>
        </div>
        <CreateProjectForm />
      </div>
    </div>
  );
}
