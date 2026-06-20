import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

// ── Icons ──────────────────────────────────────────────────────────────────────

function IcoLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="8.5" stroke="var(--accent)" strokeWidth="1.5" />
      <circle cx="10" cy="10" r="3.5" fill="var(--accent)" />
      <line x1="10" y1="1.5" x2="10" y2="5.5" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10" y1="14.5" x2="10" y2="18.5" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="1.5" y1="10" x2="5.5" y2="10" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="14.5" y1="10" x2="18.5" y2="10" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ── Decorative trace preview ───────────────────────────────────────────────────

function TracePreview() {
  const spans = [
    { name: "AgentExecutor", type: "chain", ms: 1842, depth: 0 },
    { name: "ChatGroq", type: "llm", ms: 412, depth: 1 },
    { name: "pgvector_retriever", type: "retriever", ms: 88, depth: 1 },
    { name: "router", type: "chain", ms: 204, depth: 1 },
    { name: "ChatAnthropic", type: "llm", ms: 1138, depth: 2 },
  ];

  const typeColors: Record<string, { color: string; bg: string }> = {
    llm: { color: "#818cf8", bg: "rgba(99,102,241,0.15)" },
    chain: { color: "#c084fc", bg: "rgba(192,132,252,0.15)" },
    retriever: { color: "#4edea3", bg: "rgba(78,222,163,0.12)" },
    tool: { color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
  };

  return (
    <div
      style={{
        background: "var(--surface)",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
      }}
    >
      {/* Title bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 16px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-deep)",
        }}
      >
        <div style={{ display: "flex", gap: 5 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", opacity: 0.6 }} />
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b", opacity: 0.6 }} />
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", opacity: 0.6 }} />
        </div>
        <span style={{ marginLeft: 8, fontSize: 11, color: "var(--text-muted)" }}>
          Trace · agent_run_7f3c2a · 1.84s
        </span>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#10b981",
              display: "inline-block",
            }}
          />
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>no errors</span>
        </span>
      </div>

      {/* Spans */}
      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 7 }}>
        {spans.map((s, i) => {
          const tc = typeColors[s.type] ?? typeColors.chain;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                paddingLeft: s.depth * 20,
              }}
            >
              {s.depth > 0 && (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  style={{ flexShrink: 0, opacity: 0.3 }}
                  aria-hidden
                >
                  <path d="M2 2v6h8" stroke="var(--border-strong)" strokeWidth="1.2" fill="none" />
                </svg>
              )}
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: tc.bg,
                  color: tc.color,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  flexShrink: 0,
                }}
              >
                {s.type}
              </span>
              <span style={{ fontSize: 12, color: "var(--text-primary)" }}>{s.name}</span>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 11,
                  color: "var(--text-muted)",
                  fontVariantNumeric: "tabular-nums",
                  whiteSpace: "nowrap",
                }}
              >
                {s.ms}ms
              </span>
              <div
                style={{
                  width: 52,
                  height: 10,
                  background: "var(--bg-deep)",
                  borderRadius: 2,
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min((s.ms / 2000) * 100, 100)}%`,
                    background: tc.color,
                    opacity: 0.4,
                    borderRadius: 2,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Metric bar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          borderTop: "1px solid var(--border)",
          background: "var(--bg-deep)",
        }}
      >
        {[
          { label: "Total latency", value: "1,842ms" },
          { label: "Token cost", value: "$0.000847" },
          { label: "Spans", value: "5" },
        ].map((m, i) => (
          <div
            key={i}
            style={{
              padding: "10px 16px",
              borderRight: i < 2 ? "1px solid var(--border)" : "none",
            }}
          >
            <p
              style={{
                fontSize: 10,
                color: "var(--text-muted)",
                margin: "0 0 3px",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              {m.label}
            </p>
            <p
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--text-secondary)",
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              {m.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Feature card ───────────────────────────────────────────────────────────────

const FEATURE_ICONS = {
  activity: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <polyline
        points="1.5,12 5,7 8,10.5 12,4 16.5,8"
        stroke="var(--accent)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  dollar: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <circle cx="9" cy="9" r="7.5" stroke="var(--accent)" strokeWidth="1.5" />
      <path
        d="M9 5v1.5M9 11.5V13M7.5 7.5h2a1.5 1.5 0 010 3h-2a1.5 1.5 0 000 3H11"
        stroke="var(--accent)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  sankey: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path
        d="M2 5h4M2 13h4M6 5c0 0 0 4 4 4s4 4 4 4M6 13V9"
        stroke="var(--accent)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="14" cy="9" r="2" stroke="var(--accent)" strokeWidth="1.5" />
    </svg>
  ),
};

function FeatureCard({
  icon,
  title,
  desc,
  badge,
}: {
  icon: keyof typeof FEATURE_ICONS;
  title: string;
  desc: string;
  badge: string;
}) {
  return (
    <div
      className="feature-card"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        transition: "border-color 150ms, background 150ms",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: "var(--accent-dim)",
          border: "1px solid rgba(99,102,241,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {FEATURE_ICONS[icon]}
      </div>
      <div>
        <h3
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "var(--text-primary)",
            margin: "0 0 8px",
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </h3>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, lineHeight: 1.65 }}>
          {desc}
        </p>
      </div>
      <span
        style={{
          fontSize: 11,
          color: "var(--accent-hover)",
          fontFamily: "var(--font-mono)",
          background: "var(--accent-dim)",
          padding: "3px 8px",
          borderRadius: 4,
          alignSelf: "flex-start",
          border: "1px solid rgba(99,102,241,0.18)",
        }}
      >
        {badge}
      </span>
    </div>
  );
}

// ── Code snippet ───────────────────────────────────────────────────────────────

function CodeSnippet() {
  return (
    <div
      style={{
        background: "var(--bg-deep)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      {/* Title bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "11px 20px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", opacity: 0.6 }} />
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b", opacity: 0.6 }} />
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", opacity: 0.6 }} />
        </div>
        <span
          style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}
        >
          sdk/tracer_callback.py
        </span>
        <span style={{ fontSize: 11, opacity: 0 }}>placeholder</span>
      </div>

      {/* Code body */}
      <div
        style={{
          padding: "24px 28px",
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          lineHeight: 2,
        }}
      >
        <p style={{ margin: 0, color: "#555570" }}># drop-in — no framework changes needed</p>
        <p style={{ margin: 0 }}>
          <span style={{ color: "#c084fc" }}>from</span>
          <span style={{ color: "var(--text-secondary)" }}> sdk.tracer_callback </span>
          <span style={{ color: "#c084fc" }}>import</span>
          <span style={{ color: "#818cf8" }}> CustomTracer</span>
        </p>
        <p style={{ margin: 0 }}>&nbsp;</p>
        <p style={{ margin: 0 }}>
          <span style={{ color: "#4edea3" }}>tracer</span>
          <span style={{ color: "var(--text-muted)" }}> = </span>
          <span style={{ color: "#818cf8" }}>CustomTracer</span>
          <span style={{ color: "var(--text-secondary)" }}>(</span>
          <span style={{ color: "#fbbf24" }}>endpoint</span>
          <span style={{ color: "var(--text-muted)" }}>=</span>
          <span style={{ color: "#10b981" }}>&quot;https://tracer.yourdomain.com&quot;</span>
          <span style={{ color: "var(--text-secondary)" }}>, </span>
          <span style={{ color: "#fbbf24" }}>project</span>
          <span style={{ color: "var(--text-muted)" }}>=</span>
          <span style={{ color: "#10b981" }}>&quot;my-agent&quot;</span>
          <span style={{ color: "var(--text-secondary)" }}>)</span>
        </p>
        <p style={{ margin: 0 }}>
          <span style={{ color: "#4edea3" }}>chain</span>
          <span style={{ color: "var(--text-secondary)" }}>.</span>
          <span style={{ color: "#818cf8" }}>invoke</span>
          <span style={{ color: "var(--text-secondary)" }}>(</span>
          <span style={{ color: "#4edea3" }}>input</span>
          <span style={{ color: "var(--text-secondary)" }}>, </span>
          <span style={{ color: "#fbbf24" }}>config</span>
          <span style={{ color: "var(--text-muted)" }}>=</span>
          <span style={{ color: "var(--text-secondary)" }}>{`{`}</span>
          <span style={{ color: "#10b981" }}>&quot;callbacks&quot;</span>
          <span style={{ color: "var(--text-muted)" }}>: </span>
          <span style={{ color: "var(--text-secondary)" }}>[</span>
          <span style={{ color: "#4edea3" }}>tracer</span>
          <span style={{ color: "var(--text-secondary)" }}>{"]}"}</span>
          <span style={{ color: "var(--text-secondary)" }}>)</span>
        </p>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function LandingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/projects");

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .land-hero     { animation: fadeUp 0.55s cubic-bezier(0.16,1,0.3,1) both; }
        .land-features { animation: fadeUp 0.55s 0.15s cubic-bezier(0.16,1,0.3,1) both; }
        .land-code     { animation: fadeUp 0.55s 0.25s cubic-bezier(0.16,1,0.3,1) both; }
        .land-cta      { animation: fadeUp 0.55s 0.35s cubic-bezier(0.16,1,0.3,1) both; }
        .btn-primary { transition: background 150ms, transform 150ms, box-shadow 150ms; }
        .btn-primary:hover { background: var(--accent-hover) !important; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(99,102,241,0.3); }
        .btn-secondary { transition: background 150ms, border-color 150ms; }
        .btn-secondary:hover { background: var(--surface-high) !important; border-color: var(--border-strong) !important; }
        .feature-card:hover { border-color: rgba(99,102,241,0.3) !important; background: var(--surface-low) !important; }
        .nav-link { transition: color 150ms; }
        .nav-link:hover { color: var(--text-primary) !important; }
      `}</style>

      <div
        style={{
          minHeight: "100svh",
          background: "var(--background)",
          position: "relative",
          overflowX: "hidden",
        }}
      >
        {/* Background glow orbs */}
        <div
          aria-hidden
          style={{
            position: "fixed",
            top: "5%",
            left: "15%",
            width: 700,
            height: 700,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99,102,241,0.055) 0%, transparent 65%)",
            pointerEvents: "none",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "fixed",
            bottom: "15%",
            right: "8%",
            width: 450,
            height: 450,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(16,185,129,0.04) 0%, transparent 65%)",
            pointerEvents: "none",
          }}
        />

        {/* ── Navigation ───────────────────────────────────────────────── */}
        <nav
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 48px",
            height: 60,
            borderBottom: "1px solid var(--border)",
            backdropFilter: "blur(16px)",
            background: "rgba(16,19,26,0.85)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <IcoLogo />
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "var(--text-primary)",
                letterSpacing: "-0.02em",
              }}
            >
              Tracer
            </span>
            <span
              style={{
                fontSize: 10,
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono)",
                background: "var(--surface-high)",
                border: "1px solid var(--border)",
                padding: "2px 6px",
                borderRadius: 4,
                marginLeft: 2,
              }}
            >
              v3
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link
              href="/signin"
              className="nav-link"
              style={{
                fontSize: 13,
                color: "var(--text-muted)",
                textDecoration: "none",
                padding: "6px 14px",
              }}
            >
              Sign In
            </Link>
            <Link
              href="/signin"
              className="btn-primary"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#fff",
                textDecoration: "none",
                padding: "7px 16px",
                borderRadius: 7,
                background: "var(--accent)",
                border: "1px solid rgba(99,102,241,0.35)",
              }}
            >
              Get Started →
            </Link>
          </div>
        </nav>

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section
          className="land-hero"
          style={{
            maxWidth: 1080,
            margin: "0 auto",
            padding: "80px 48px 64px",
            textAlign: "center",
          }}
        >
          {/* Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "var(--accent-dim)",
              border: "1px solid rgba(99,102,241,0.22)",
              borderRadius: 999,
              padding: "5px 14px",
              marginBottom: 32,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#10b981",
                display: "inline-block",
                boxShadow: "0 0 6px #10b981",
              }}
            />
            <span
              style={{
                fontSize: 12,
                color: "var(--accent-hover)",
                fontFamily: "var(--font-mono)",
              }}
            >
              Self-hosted · LangChain · LangGraph
            </span>
          </div>

          {/* Headline */}
          <h1
            style={{
              fontSize: "clamp(36px, 6vw, 62px)",
              fontWeight: 800,
              color: "var(--text-primary)",
              margin: "0 auto 20px",
              lineHeight: 1.1,
              letterSpacing: "-0.04em",
              maxWidth: 680,
            }}
          >
            Observability for
            <br />
            <span style={{ color: "var(--accent-hover)" }}>LLM applications</span>
          </h1>

          {/* Subtext */}
          <p
            style={{
              fontSize: 17,
              color: "var(--text-muted)",
              margin: "0 auto 40px",
              lineHeight: 1.7,
              maxWidth: 460,
            }}
          >
            Async trace ingestion, per-token cost analytics, and routing-path Sankey
            diagrams — built for LangChain.
          </p>

          {/* CTAs */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              marginBottom: 64,
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/signin"
              className="btn-primary"
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "#fff",
                textDecoration: "none",
                padding: "13px 30px",
                borderRadius: 9,
                background: "var(--accent)",
                border: "1px solid rgba(99,102,241,0.35)",
              }}
            >
              Start monitoring →
            </Link>
            <Link
              href="/signin"
              className="btn-secondary"
              style={{
                fontSize: 15,
                fontWeight: 500,
                color: "var(--text-secondary)",
                textDecoration: "none",
                padding: "13px 26px",
                borderRadius: 9,
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              Sign In
            </Link>
          </div>

          {/* Trace preview */}
          <div
            style={{
              maxWidth: 740,
              margin: "0 auto",
              borderRadius: 14,
              overflow: "hidden",
              border: "1px solid var(--border)",
              boxShadow:
                "0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03) inset",
            }}
          >
            <TracePreview />
          </div>
        </section>

        {/* ── Features ─────────────────────────────────────────────────── */}
        <section
          className="land-features"
          style={{
            maxWidth: 1080,
            margin: "0 auto",
            padding: "0 48px 64px",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <p
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono)",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                marginBottom: 10,
              }}
            >
              What you get
            </p>
            <h2
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: "var(--text-primary)",
                margin: 0,
                letterSpacing: "-0.03em",
              }}
            >
              Everything to debug and understand LLMs
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            <FeatureCard
              icon="activity"
              title="Full trace ingestion"
              desc="Every span — LLM calls, chain steps, retriever hits, tool invocations — captured async. Never adds latency to your chain."
              badge="< 1ms overhead"
            />
            <FeatureCard
              icon="dollar"
              title="Cost analytics"
              desc="Token cost broken down per session, per node, and over time. Spot expensive calls before they blow your budget."
              badge="per-token precision"
            />
            <FeatureCard
              icon="sankey"
              title="Routing path visualization"
              desc="Sankey diagrams of every routing decision your agent makes. See exactly which paths are taken most and why."
              badge="d3-sankey powered"
            />
          </div>
        </section>

        {/* ── SDK snippet ───────────────────────────────────────────────── */}
        <section
          className="land-code"
          style={{ maxWidth: 1080, margin: "0 auto", padding: "0 48px 64px" }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 40, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 260px", paddingTop: 8 }}>
              <p
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-mono)",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  marginBottom: 10,
                }}
              >
                SDK integration
              </p>
              <h2
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  margin: "0 0 14px",
                  letterSpacing: "-0.03em",
                  lineHeight: 1.25,
                }}
              >
                Three lines to start tracing
              </h2>
              <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7, margin: 0 }}>
                Drop the Python or TypeScript SDK into your existing LangChain app.
                No framework changes. Every callback fires automatically.
              </p>
              <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  "Works with ChatGroq, ChatAnthropic, ChatOpenAI",
                  "TypeScript port for Next.js apps",
                  "Fire-and-forget — never blocks the chain",
                ].map((item) => (
                  <div
                    key={item}
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                      <circle cx="7" cy="7" r="6" fill="var(--success-dim)" stroke="var(--success)" strokeWidth="1.2" />
                      <path d="M4.5 7L6 8.5L9.5 5" stroke="var(--success)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ flex: "2 1 400px" }}>
              <CodeSnippet />
            </div>
          </div>
        </section>

        {/* ── Final CTA ─────────────────────────────────────────────────── */}
        <section
          className="land-cta"
          style={{ maxWidth: 1080, margin: "0 auto", padding: "0 48px 80px" }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, var(--surface) 0%, var(--bg-deep) 100%)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: "56px 48px",
              textAlign: "center",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Glow */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: 500,
                height: 200,
                borderRadius: "50%",
                background:
                  "radial-gradient(ellipse, rgba(99,102,241,0.09) 0%, transparent 70%)",
                pointerEvents: "none",
              }}
            />
            <h2
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: "var(--text-primary)",
                margin: "0 0 12px",
                letterSpacing: "-0.03em",
                position: "relative",
              }}
            >
              Start monitoring in minutes
            </h2>
            <p
              style={{
                fontSize: 14,
                color: "var(--text-muted)",
                margin: "0 auto 32px",
                maxWidth: 380,
                lineHeight: 1.7,
                position: "relative",
              }}
            >
              Self-hosted, full-stack observability for your LangChain applications.
              No SaaS dependency.
            </p>
            <Link
              href="/signin"
              className="btn-primary"
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "#fff",
                textDecoration: "none",
                padding: "13px 32px",
                borderRadius: 9,
                background: "var(--accent)",
                border: "1px solid rgba(99,102,241,0.35)",
                position: "relative",
                display: "inline-block",
              }}
            >
              Create account →
            </Link>
          </div>
        </section>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <footer
          style={{
            borderTop: "1px solid var(--border)",
            padding: "18px 48px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <IcoLogo />
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
              Tracer — self-hosted LLM observability
            </span>
          </div>
          <span
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono)",
            }}
          >
            v3 · portfolio
          </span>
        </footer>
      </div>
    </>
  );
}
