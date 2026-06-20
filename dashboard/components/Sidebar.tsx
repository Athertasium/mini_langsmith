"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useSession, signOut } from "@/lib/auth-client";

// ── Icons ─────────────────────────────────────────────────────────────
function IcoLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="8.5" stroke="var(--accent)" strokeWidth="1.5" />
      <circle cx="10" cy="10" r="3.5" fill="var(--accent)" />
      <line x1="10" y1="1.5" x2="10" y2="5.5" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10" y1="14.5" x2="10" y2="18.5" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="1.5" y1="10" x2="5.5" y2="10" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="14.5" y1="10" x2="18.5" y2="10" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IcoFolder() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <path d="M1.5 4a1 1 0 011-1h3l1.5 1.5H13a1 1 0 011 1v5.5a1 1 0 01-1 1H2.5a1 1 0 01-1-1V4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function IcoActivity() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <polyline points="1.5,9.5 4.5,5.5 7.5,8.5 10.5,3.5 13.5,6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IcoSankey() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <path d="M2 4.5h3M2 10.5h3M5 4.5C5 4.5 5 7.5 8 7.5s3 3 3 3M5 10.5V7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="7.5" r="1.5" stroke="currentColor" strokeWidth="1.4" />
      <line x1="10" y1="7.5" x2="10.5" y2="7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function IcoCoin() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M7.5 4.5v1.5m0 3V10m-1.5-5h2.5a1.5 1.5 0 010 3H6a1.5 1.5 0 000 3h3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function IcoShield() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <path d="M7.5 1.5L13 4v4c0 3-2.5 5-5.5 5.5C4.5 13 2 11 2 8V4L7.5 1.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M5 7.5L6.5 9L10 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IcoSearch() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
      <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.4" />
      <line x1="8.5" y1="8.5" x2="12" y2="12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

// ── Nav item ──────────────────────────────────────────────────────────
function NavItem({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className="nav-item flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium"
      style={
        active
          ? {
              background: "var(--accent-dim)",
              color: "var(--accent-hover)",
              border: "1px solid rgba(99,102,241,0.2)",
            }
          : {
              color: "var(--text-muted)",
              border: "1px solid transparent",
            }
      }
    >
      <span style={{ opacity: active ? 1 : 0.65, flexShrink: 0 }}>{icon}</span>
      <span className="truncate">{label}</span>
      {active && (
        <span
          className="ml-auto w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: "var(--accent)" }}
        />
      )}
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="px-3 mt-4 mb-1 text-[10px] font-semibold uppercase tracking-widest"
      style={{ color: "var(--text-muted)", opacity: 0.5, fontFamily: "var(--font-mono)" }}
    >
      {children}
    </p>
  );
}

// ── Inner (uses hooks — must be inside Suspense) ──────────────────────
function SidebarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const project = searchParams.get("project");
  const { data: session } = useSession();

  if (pathname === "/signin") return null;

  const proj = (base: string) =>
    project ? `${base}?project=${encodeURIComponent(project)}` : "/projects";

  const isTraces = pathname.startsWith("/traces") && !pathname.includes("[");
  const isDetail = /^\/traces\/[^/]+$/.test(pathname);
  const isPaths  = pathname === "/paths";
  const isCost   = pathname === "/cost";
  const isAdmin  = pathname.startsWith("/admin");
  const isProjects = pathname === "/projects" || pathname === "/";

  return (
    <aside
      className="flex flex-col shrink-0 h-screen sticky top-0 overflow-hidden"
      style={{
        width: "var(--sidebar-w)",
        background: "var(--bg-deep)",
        borderRight: "1px solid var(--border)",
      }}
    >
      {/* ── Logo ─────────────────────────────────────────── */}
      <Link
        href="/projects"
        className="flex items-center gap-2.5 px-4 pt-4 pb-3 shrink-0"
        style={{ textDecoration: "none" }}
      >
        <IcoLogo />
        <div>
          <span
            className="block text-sm font-semibold"
            style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}
          >
            Tracer
          </span>
          <span
            className="block text-[10px]"
            style={{ color: "var(--text-muted)" }}
          >
            Observability
          </span>
        </div>
      </Link>

      {/* ── Search ───────────────────────────────────────── */}
      <div className="px-3 mb-2">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-md text-xs cursor-text select-none"
          style={{
            background: "var(--surface-low)",
            border: "1px solid var(--border)",
            color: "var(--text-muted)",
          }}
        >
          <IcoSearch />
          <span>Search traces…</span>
          <kbd
            className="ml-auto rounded px-1 text-[10px]"
            style={{
              background: "var(--surface-high)",
              border: "1px solid var(--border-strong)",
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono)",
            }}
          >
            ⌘K
          </kbd>
        </div>
      </div>

      {/* ── Divider ──────────────────────────────────────── */}
      <div className="mx-3 mb-1" style={{ height: 1, background: "var(--border)" }} />

      {/* ── Navigation ───────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 pb-3">
        <SectionLabel>Workspace</SectionLabel>
        <NavItem
          href="/projects"
          icon={<IcoFolder />}
          label="Projects"
          active={isProjects}
        />

        {/* Project-scoped nav — only visible when in a project context */}
        {(project || isTraces || isDetail || isPaths || isCost) && (
          <>
            <SectionLabel>
              {project ? project : "Project"}
            </SectionLabel>
            <NavItem
              href={proj("/traces")}
              icon={<IcoActivity />}
              label="Traces"
              active={isTraces || isDetail}
            />
            <NavItem
              href={proj("/paths")}
              icon={<IcoSankey />}
              label="Paths"
              active={isPaths}
            />
            <NavItem
              href={proj("/cost")}
              icon={<IcoCoin />}
              label="Cost"
              active={isCost}
            />
          </>
        )}

        <SectionLabel>System</SectionLabel>
        <NavItem
          href="/admin/dlq"
          icon={<IcoShield />}
          label="Dead Letter Queue"
          active={isAdmin}
        />
      </nav>

      {/* ── Footer ───────────────────────────────────────── */}
      <div
        className="px-3 py-3 shrink-0"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
            style={{ background: "var(--accent-dim)", color: "var(--accent-hover)" }}
          >
            {session?.user?.name?.[0]?.toUpperCase() ?? "T"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium truncate" style={{ color: "var(--text-secondary)" }}>
              {session?.user?.name ?? "Tracer"}
            </p>
            <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>
              {session?.user?.email ?? "v3 · self-hosted"}
            </p>
          </div>
          <button
            onClick={async () => {
              await signOut();
              router.push("/signin");
            }}
            title="Sign out"
            className="shrink-0 rounded p-1 hover:bg-surface transition-colors"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 15 15" fill="none" aria-label="Sign out">
              <path d="M6 2H3a1 1 0 00-1 1v9a1 1 0 001 1h3M10 10l3-3-3-3M13 7.5H5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}

export function Sidebar() {
  return (
    <Suspense fallback={null}>
      <SidebarInner />
    </Suspense>
  );
}
