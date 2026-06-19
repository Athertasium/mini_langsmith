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
    <div className="mb-6 flex items-center gap-4">
      <Link
        href="/projects"
        className="text-xs transition-colors hover:text-indigo-400"
        style={{ color: "var(--text-secondary)" }}
      >
        ← Projects
      </Link>
      <span style={{ color: "var(--border)" }}>|</span>
      <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
        {project}
      </span>
      <span style={{ color: "var(--border)" }}>|</span>
      <nav className="flex gap-1">
        {tabs.map(({ label, href, key }) => (
          <Link
            key={key}
            href={href}
            className="rounded px-3 py-1 text-sm transition-colors"
            style={
              active === key
                ? { background: "var(--surface-2)", color: "var(--text-primary)", border: "1px solid var(--border)" }
                : { color: "var(--text-secondary)" }
            }
          >
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
