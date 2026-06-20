"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { authClient } from "@/lib/auth-client";

// ── Icons ─────────────────────────────────────────────────────────────────────

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

function IcoMail() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <rect x="1.5" y="3.5" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1.5 5L7.5 8.5L13.5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function IcoLock() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <rect x="3" y="7" width="9" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5 7V5a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="7.5" cy="10" r="0.8" fill="currentColor" />
    </svg>
  );
}

function IcoUser() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <circle cx="7.5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2 13c0-3 2.5-4.5 5.5-4.5S13 10 13 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function IcoGoogle() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function IcoGitHub() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  );
}

// ── Animated metric card ───────────────────────────────────────────────────────

function MetricCard({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div
      style={{
        background: "rgba(29,32,38,0.7)",
        border: "1px solid var(--border)",
        backdropFilter: "blur(12px)",
        borderRadius: 10,
        padding: "14px 18px",
      }}
    >
      <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 700, color, letterSpacing: "-0.03em" }}>
        {value}
        <span style={{ fontSize: 13, fontWeight: 400, color: "var(--text-muted)", marginLeft: 4 }}>{unit}</span>
      </p>
    </div>
  );
}

// ── Sparkline SVG (purely decorative) ─────────────────────────────────────────

function SparklineDeco() {
  const pts = [18, 32, 22, 45, 28, 38, 52, 35, 60, 28, 72, 42, 80, 30, 92, 20, 104, 34, 116, 18, 128, 28, 140, 15];
  const path = pts.reduce((acc, v, i) => acc + (i % 2 === 0 ? (i === 0 ? `M${v},` : ` L${v},`) : `${65 - v / 2}`), "");
  return (
    <svg width="160" height="36" viewBox="0 0 160 36" fill="none" aria-hidden>
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="1" />
        </linearGradient>
      </defs>
      <path d={path} stroke="url(#sparkGrad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Field ─────────────────────────────────────────────────────────────────────

function Field({
  label, type, value, onChange, icon, placeholder, required,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  icon: React.ReactNode;
  placeholder: string;
  required?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
        {label}
      </label>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "var(--bg-deep)",
          border: `1px solid ${focused ? "var(--accent)" : "var(--border)"}`,
          borderRadius: 8,
          padding: "0 14px",
          transition: "border-color 150ms",
          boxShadow: focused ? "0 0 0 3px rgba(99,102,241,0.12)" : "none",
        }}
      >
        <span style={{ color: focused ? "var(--accent)" : "var(--text-muted)", flexShrink: 0, transition: "color 150ms" }}>
          {icon}
        </span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--text-primary)",
            fontSize: 14,
            padding: "11px 0",
            fontFamily: "inherit",
          }}
        />
      </div>
    </div>
  );
}

// ── Main Form ─────────────────────────────────────────────────────────────────

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/projects";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const hasGoogle = true;
  const hasGitHub = true;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "signin") {
        const res = await authClient.signIn.email({ email, password });
        if (res.error) throw new Error(res.error.message ?? "Sign in failed");
      } else {
        const res = await authClient.signUp.email({ email, password, name });
        if (res.error) throw new Error(res.error.message ?? "Sign up failed");
      }
      router.push(callbackUrl);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    await authClient.signIn.social({ provider: "google", callbackURL: callbackUrl });
  }

  async function handleGitHub() {
    await authClient.signIn.social({ provider: "github", callbackURL: callbackUrl });
  }

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: "36px 32px",
        width: "100%",
        maxWidth: 420,
        display: "flex",
        flexDirection: "column",
        gap: 24,
        boxShadow: "0 24px 64px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04) inset",
      }}
    >
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
          {mode === "signin" ? "Welcome back" : "Create account"}
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "6px 0 0" }}>
          {mode === "signin"
            ? "Sign in to monitor your LLM applications."
            : "Get started with Tracer observability."}
        </p>
      </div>

      {/* Mode tabs */}
      <div
        style={{
          display: "flex",
          background: "var(--bg-deep)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: 3,
          gap: 3,
        }}
      >
        {(["signin", "signup"] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setError(""); }}
            style={{
              flex: 1,
              padding: "7px 12px",
              borderRadius: 6,
              border: "none",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 150ms",
              background: mode === m ? "var(--surface-high)" : "transparent",
              color: mode === m ? "var(--text-primary)" : "var(--text-muted)",
              boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.3)" : "none",
            }}
          >
            {m === "signin" ? "Sign In" : "Sign Up"}
          </button>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {mode === "signup" && (
          <Field
            label="Full Name"
            type="text"
            value={name}
            onChange={setName}
            icon={<IcoUser />}
            placeholder="Ada Lovelace"
            required
          />
        )}
        <Field
          label="Email Address"
          type="email"
          value={email}
          onChange={setEmail}
          icon={<IcoMail />}
          placeholder="you@example.com"
          required
        />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          icon={<IcoLock />}
          placeholder="••••••••"
          required
        />

        {mode === "signin" && (
          <div style={{ textAlign: "right", marginTop: -8 }}>
            <button
              type="button"
              style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 12, cursor: "pointer", padding: 0 }}
            >
              Forgot password?
            </button>
          </div>
        )}

        {error && (
          <div
            style={{
              background: "var(--error-dim)",
              border: "1px solid rgba(244,63,94,0.3)",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 13,
              color: "var(--error-color)",
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            background: loading ? "rgba(99,102,241,0.5)" : "var(--accent)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "12px",
            fontSize: 14,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            transition: "all 150ms",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            letterSpacing: "-0.01em",
          }}
          onMouseEnter={(e) => { if (!loading) (e.target as HTMLButtonElement).style.background = "var(--accent-hover)"; }}
          onMouseLeave={(e) => { if (!loading) (e.target as HTMLButtonElement).style.background = "var(--accent)"; }}
        >
          {loading ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 0.8s linear infinite" }}>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              {mode === "signin" ? "Signing in…" : "Creating account…"}
            </>
          ) : (
            mode === "signin" ? "Sign In →" : "Create Account →"
          )}
        </button>
      </form>

      {/* OAuth divider */}
      {(hasGoogle || hasGitHub) && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>or continue with</span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            {hasGoogle && (
              <OAuthBtn onClick={handleGoogle} icon={<IcoGoogle />} label="Google" />
            )}
            {hasGitHub && (
              <OAuthBtn onClick={handleGitHub} icon={<IcoGitHub />} label="GitHub" />
            )}
          </div>
        </>
      )}
    </div>
  );
}

function OAuthBtn({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "10px 14px",
        background: hovered ? "var(--surface-high)" : "var(--surface-low)",
        border: `1px solid ${hovered ? "var(--border-strong)" : "var(--border)"}`,
        borderRadius: 8,
        color: "var(--text-secondary)",
        fontSize: 13,
        fontWeight: 500,
        cursor: "pointer",
        transition: "all 150ms",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

// ── Left panel (decorative info) ──────────────────────────────────────────────

function InfoPanel() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 2000);
    return () => clearInterval(id);
  }, []);

  const spansPerSec = (12000 + ((tick * 317) % 4000)).toLocaleString();

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "48px 64px 48px 48px",
        gap: 40,
        maxWidth: 480,
      }}
    >
      {/* Brand */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <IcoLogo />
          <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>Tracer</span>
        </div>
        <h2 style={{ fontSize: 32, fontWeight: 800, color: "var(--text-primary)", margin: 0, lineHeight: 1.2, letterSpacing: "-0.03em" }}>
          Precision<br />
          <span style={{ color: "var(--accent)" }}>observability</span><br />
          for LLMs.
        </h2>
        <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "16px 0 0", lineHeight: 1.6, maxWidth: 340 }}>
          Self-hosted trace ingestion, cost analytics, and routing-path visualization — built for LangChain applications.
        </p>
      </div>

      {/* Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <MetricCard label="Ingestion Rate" value={spansPerSec} unit="spans/sec" color="var(--accent-hover)" />
        <MetricCard label="Latency p95" value="142" unit="ms" color="var(--success)" />
      </div>

      {/* Sparkline */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Trace volume · 24h</span>
        </div>
        <SparklineDeco />
      </div>

      {/* Status */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            width: 7, height: 7, borderRadius: "50%",
            background: "var(--success)",
            boxShadow: "0 0 6px var(--success)",
            display: "inline-block",
            animation: "pulse 2s ease-in-out infinite",
          }}
        />
        <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
          All systems operational
        </span>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SignInPage() {
  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
      `}</style>
      <div
        style={{
          minHeight: "100svh",
          display: "flex",
          background: "var(--background)",
        }}
      >
        {/* Left: info */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            borderRight: "1px solid var(--border)",
            background: "linear-gradient(135deg, var(--bg-deep) 0%, var(--background) 100%)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Glow orb */}
          <div
            style={{
              position: "absolute",
              top: "30%",
              left: "20%",
              width: 400,
              height: 400,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <Suspense fallback={null}>
            <InfoPanel />
          </Suspense>
        </div>

        {/* Right: form */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "48px 24px",
          }}
        >
          <Suspense fallback={null}>
            <SignInForm />
          </Suspense>
        </div>
      </div>
    </>
  );
}
