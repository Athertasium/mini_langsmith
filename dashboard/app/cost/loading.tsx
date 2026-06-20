function SkeletonSubNav() {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-1.5 mb-4">
        <div className="skeleton h-3 w-12 rounded" />
        <div className="skeleton h-3 w-3 rounded" />
        <div className="skeleton h-3 w-20 rounded" />
      </div>
      <div className="flex items-center gap-0.5" style={{ borderBottom: "1px solid var(--border)" }}>
        {["Traces", "Paths", "Cost"].map((label) => (
          <div key={label} className="px-3.5 py-2">
            <div className="skeleton h-3.5 w-10 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonTableRow() {
  return (
    <div
      className="flex items-center gap-4 px-4 py-3"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <div className="skeleton h-3.5 w-28 rounded" />
      <div className="skeleton h-5 w-16 rounded-full" />
      <div className="ml-auto flex gap-6">
        <div className="skeleton h-3.5 w-16 rounded" />
        <div className="skeleton h-3.5 w-14 rounded" />
        <div className="skeleton h-3.5 w-10 rounded" />
      </div>
    </div>
  );
}

function SkeletonSessionRow() {
  return (
    <div
      className="flex items-center gap-4 px-4 py-3"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <div className="skeleton h-3.5 w-24 rounded" />
      <div className="skeleton h-3.5 w-20 rounded" />
      <div className="ml-auto flex gap-4">
        <div className="skeleton h-3.5 w-8 rounded" />
        <div className="skeleton h-3.5 w-16 rounded" />
      </div>
    </div>
  );
}

export default function CostLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <SkeletonSubNav />

      {/* Header */}
      <div className="mb-6">
        <div className="skeleton mb-2 h-6 w-40 rounded" />
        <div className="skeleton h-3.5 w-64 rounded" />
      </div>

      {/* Date range buttons */}
      <div className="mb-6 flex gap-1">
        {[80, 90, 60].map((w, i) => (
          <div key={i} className="skeleton h-7 rounded" style={{ width: w }} />
        ))}
      </div>

      {/* Trend chart */}
      <div
        className="mb-6 rounded-lg px-4 py-4"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="skeleton mb-3 h-4 w-28 rounded" />
        <div className="skeleton h-44 w-full rounded" />
      </div>

      {/* Node table + Session list */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Node cost table */}
        <div
          className="rounded-lg overflow-hidden"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div
            className="px-4 py-3"
            style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-high)" }}
          >
            <div className="skeleton h-4 w-28 rounded" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonTableRow key={i} />
          ))}
        </div>

        {/* Session cost list */}
        <div
          className="rounded-lg overflow-hidden"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div
            className="px-4 py-3"
            style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-high)" }}
          >
            <div className="skeleton h-4 w-24 rounded" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonSessionRow key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
