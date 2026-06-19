"use client";

import { useEffect, useState } from "react";

interface DlqEntry {
  payload: Record<string, unknown>;
  error: string | null;
  failed_at: string;
}

interface DlqResponse {
  entries: DlqEntry[];
  total: number;
}

function formatTs(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function DlqPage() {
  const [data, setData] = useState<DlqResponse | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [replaying, setReplaying] = useState<number | null>(null);
  const [replayResults, setReplayResults] = useState<Record<number, "ok" | "err">>({});
  const [expanded, setExpanded] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/admin/dlq");
      const json = await res.json();
      if (!res.ok || json.error) {
        setFetchError(json.error ?? "Request failed");
        setData(null);
      } else {
        setData(json);
      }
    } catch (e) {
      setFetchError(String(e));
      setData(null);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function replay(index: number) {
    setReplaying(index);
    const res = await fetch("/api/admin/dlq", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ index }),
    });
    setReplayResults((prev) => ({ ...prev, [index]: res.ok ? "ok" : "err" }));
    setReplaying(null);
    await load();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Dead Letter Queue
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Spans that failed to insert into Postgres. Replay re-queues the original payload
          unmodified — suitable for transient failures (DB blip, connection timeout).
          Malformed payloads will fail again on replay.
        </p>
      </div>

      {loading && (
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Loading…</p>
      )}

      {!loading && fetchError && (
        <div
          className="rounded-lg px-5 py-4"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--color-error, #ef4444)" }}>
            Failed to connect to Redis
          </p>
          <p className="mt-1 font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
            {fetchError}
          </p>
          <p className="mt-2 text-xs" style={{ color: "var(--text-secondary)" }}>
            Make sure <code>REDIS_URL</code> is set in <code>dashboard/.env.local</code> and Redis is running.
          </p>
        </div>
      )}

      {!loading && data && (
        <>
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {data.total} item{data.total !== 1 ? "s" : ""} in queue
              {data.total > 20 ? " (showing first 20)" : ""}
            </span>
            <button
              onClick={load}
              className="rounded px-3 py-1 text-xs transition-colors"
              style={{
                background: "var(--surface-2)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
              }}
            >
              Refresh
            </button>
          </div>

          {data.entries.length === 0 ? (
            <div
              className="rounded-lg px-6 py-10 text-center"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                Queue is empty
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                No failed spans. All inserts succeeded.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.entries.map((entry, i) => (
                <div
                  key={i}
                  className="rounded-lg"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  {/* Row header */}
                  <div className="flex items-center gap-4 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="rounded px-1.5 py-0.5 text-xs font-mono"
                          style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}
                        >
                          {String(entry.payload?.run_type ?? "span")}
                        </span>
                        <span className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                          {String(entry.payload?.name ?? entry.payload?.id ?? "unknown")}
                        </span>
                        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                          {formatTs(entry.failed_at)}
                        </span>
                      </div>
                      {entry.error && (
                        <p
                          className="mt-1 text-xs font-mono truncate"
                          style={{ color: "var(--color-error, #ef4444)" }}
                          title={entry.error}
                        >
                          {entry.error}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setExpanded(expanded === i ? null : i)}
                        className="rounded px-2.5 py-1 text-xs transition-colors"
                        style={{
                          background: "var(--surface-2)",
                          color: "var(--text-secondary)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        {expanded === i ? "Hide" : "JSON"}
                      </button>
                      <button
                        onClick={() => replay(i)}
                        disabled={replaying === i || replayResults[i] === "ok"}
                        className="rounded px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50"
                        style={{
                          background: replayResults[i] === "ok" ? "var(--surface-2)" : "var(--color-accent, #6366f1)",
                          color: replayResults[i] === "ok" ? "var(--text-secondary)" : "#fff",
                          border: "1px solid transparent",
                        }}
                      >
                        {replaying === i
                          ? "Replaying…"
                          : replayResults[i] === "ok"
                          ? "Replayed ✓"
                          : replayResults[i] === "err"
                          ? "Failed — retry?"
                          : "Replay"}
                      </button>
                    </div>
                  </div>

                  {/* Expanded payload */}
                  {expanded === i && (
                    <div
                      className="border-t px-4 py-3"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <pre
                        className="overflow-x-auto rounded p-3 text-xs font-mono leading-relaxed"
                        style={{
                          background: "var(--surface-2)",
                          color: "var(--text-primary)",
                          maxHeight: "320px",
                        }}
                      >
                        {JSON.stringify(entry.payload, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
