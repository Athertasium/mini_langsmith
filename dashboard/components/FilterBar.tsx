"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const RUN_TYPES = ["llm", "chain", "tool", "retriever"] as const;

const TIME_RANGES = [
  { label: "1h",  value: "1h" },
  { label: "6h",  value: "6h" },
  { label: "24h", value: "24h" },
  { label: "7d",  value: "7d" },
  { label: "All", value: "" },
] as const;

function rangeToFrom(value: string): string | null {
  if (!value) return null;
  const n = parseInt(value);
  const unit = value.slice(-1);
  const ms = unit === "d" ? n * 24 * 3600_000 : n * 3600_000;
  return new Date(Date.now() - ms).toISOString();
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className="rounded px-2.5 py-1 text-xs font-medium transition-all duration-150 cursor-pointer"
      style={
        active
          ? {
              background: "var(--accent-dim)",
              color: "var(--accent-hover)",
              border: "1px solid rgba(99, 102, 241, 0.35)",
            }
          : {
              background: "transparent",
              color: "var(--text-muted)",
              border: "1px solid transparent",
            }
      }
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span style={{ width: 1, height: 16, background: "var(--border-strong)", display: "inline-block" }} />;
}

export function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const update = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(sp.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, sp],
  );

  const setTimeRange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(sp.toString());
      const from = rangeToFrom(value);
      if (from) params.set("from", from);
      else params.delete("from");
      params.delete("to");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, sp],
  );

  const currentRunType = sp.get("run_type") ?? "";
  const errorOnly = sp.get("error_only") === "1";

  const currentRange = (() => {
    const from = sp.get("from");
    if (!from) return "";
    const diffMs = Date.now() - new Date(from).getTime();
    const diffH = diffMs / 3600_000;
    if (diffH <= 1.5) return "1h";
    if (diffH <= 7) return "6h";
    if (diffH <= 25) return "24h";
    if (diffH <= 169) return "7d";
    return "";
  })();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Run type */}
      <span className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
        type
      </span>
      <div className="flex gap-0.5">
        <Chip active={currentRunType === ""} onClick={() => update("run_type", null)}>
          all
        </Chip>
        {RUN_TYPES.map((t) => (
          <Chip
            key={t}
            active={currentRunType === t}
            onClick={() => update("run_type", currentRunType === t ? null : t)}
          >
            {t}
          </Chip>
        ))}
      </div>

      <Divider />

      {/* Time range */}
      <span className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
        range
      </span>
      <div className="flex gap-0.5">
        {TIME_RANGES.map(({ label, value }) => (
          <Chip key={label} active={currentRange === value} onClick={() => setTimeRange(value)}>
            {label}
          </Chip>
        ))}
      </div>

      <Divider />

      {/* Error only */}
      <Chip active={errorOnly} onClick={() => update("error_only", errorOnly ? null : "1")}>
        errors only
      </Chip>
    </div>
  );
}
