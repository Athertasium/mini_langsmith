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

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600_000).toISOString();
}

function rangeToFrom(value: string): string | null {
  if (!value) return null;
  const n = parseInt(value);
  const unit = value.slice(-1);
  const ms = unit === "d" ? n * 24 * 3600_000 : n * 3600_000;
  return new Date(Date.now() - ms).toISOString();
}

function chipStyle(active: boolean): React.CSSProperties {
  return active
    ? { background: "var(--accent)", color: "#fff" }
    : { background: "var(--surface-2)", color: "var(--text-secondary)" };
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
    <div className="flex flex-wrap items-center gap-3">
      {/* run_type */}
      <div className="flex gap-1">
        <button
          className="rounded px-2.5 py-1 text-xs font-medium"
          style={chipStyle(currentRunType === "")}
          onClick={() => update("run_type", null)}
        >
          All types
        </button>
        {RUN_TYPES.map((t) => (
          <button
            key={t}
            className="rounded px-2.5 py-1 text-xs font-medium"
            style={chipStyle(currentRunType === t)}
            onClick={() => update("run_type", currentRunType === t ? null : t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div style={{ width: 1, height: 20, background: "var(--border)" }} />

      {/* time range */}
      <div className="flex gap-1">
        {TIME_RANGES.map(({ label, value }) => (
          <button
            key={label}
            className="rounded px-2.5 py-1 text-xs font-medium"
            style={chipStyle(currentRange === value)}
            onClick={() => setTimeRange(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ width: 1, height: 20, background: "var(--border)" }} />

      {/* error only */}
      <button
        className="rounded px-2.5 py-1 text-xs font-medium"
        style={chipStyle(errorOnly)}
        onClick={() => update("error_only", errorOnly ? null : "1")}
      >
        Errors only
      </button>
    </div>
  );
}
