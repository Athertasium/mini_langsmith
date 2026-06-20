import Link from "next/link";

interface Props {
  project: string;
  active: "traces" | "paths" | "cost";
}

export function ProjectSubNav({ project, active }: Props) {
  const encoded = encodeURIComponent(project);

  const tabs = [
    { label: "Traces", href: `/traces?project=${encoded}`, key: "traces" },
    { label: "Paths",  href: `/paths?project=${encoded}`,  key: "paths"  },
    { label: "Cost",   href: `/cost?project=${encoded}`,   key: "cost"   },
  ] as const;

  return (
    <div className="mb-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 mb-4 text-xs" style={{ color: "var(--text-muted)" }}>
        <Link
          href="/projects"
          className="transition-colors hover:text-white"
          style={{ color: "var(--text-muted)" }}
        >
          Projects
        </Link>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden style={{ opacity: 0.35 }}>
          <path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{project}</span>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-0.5" style={{ borderBottom: "1px solid var(--border)" }}>
        {tabs.map(({ label, href, key }) => {
          const isActive = active === key;
          return (
            <Link
              key={key}
              href={href}
              className="relative px-3.5 py-2 text-sm font-medium transition-colors"
              style={{ color: isActive ? "var(--text-primary)" : "var(--text-muted)" }}
            >
              {label}
              {isActive && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-px"
                  style={{ background: "var(--accent)" }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
