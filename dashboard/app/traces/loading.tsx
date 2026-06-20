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
      <div className="skeleton h-3.5 w-32 rounded" />
      <div className="skeleton h-5 w-16 rounded-full" />
      <div className="skeleton h-3.5 w-28 rounded" />
      <div className="ml-auto flex items-center gap-4">
        <div className="skeleton h-3.5 w-16 rounded" />
        <div className="skeleton h-3.5 w-14 rounded" />
        <div className="skeleton h-3.5 w-10 rounded" />
      </div>
    </div>
  );
}

export default function TracesLoading() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <SkeletonSubNav />

      {/* Title + count */}
      <div className="mb-5 flex items-baseline gap-3">
        <div className="skeleton h-6 w-16 rounded" />
        <div className="skeleton h-5 w-8 rounded" />
      </div>

      {/* Filter bar */}
      <div
        className="mb-5 rounded-lg px-4 py-3"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-3">
          <div className="skeleton h-7 w-28 rounded-md" />
          <div className="skeleton h-7 w-24 rounded-md" />
          <div className="skeleton h-7 w-20 rounded-md" />
          <div className="skeleton h-7 w-32 rounded-md" />
        </div>
      </div>

      {/* Latency chart */}
      <div
        className="mb-5 rounded-lg px-4 py-4"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="skeleton mb-3 h-4 w-24 rounded" />
        <div className="skeleton h-36 w-full rounded" />
      </div>

      {/* Table */}
      <div
        className="rounded-lg overflow-hidden"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        {/* Table header */}
        <div
          className="flex items-center gap-4 px-4 py-2.5"
          style={{ background: "var(--surface-high)", borderBottom: "1px solid var(--border)" }}
        >
          {[32, 16, 28, 16, 14, 10].map((w, i) => (
            <div key={i} className={`skeleton h-3 w-${w} rounded`} />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonTableRow key={i} />
        ))}
      </div>
    </div>
  );
}
