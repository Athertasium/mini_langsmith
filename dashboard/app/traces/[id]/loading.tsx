function SkeletonMetaStat() {
  return (
    <div>
      <div className="skeleton mb-2 h-3 w-14 rounded" />
      <div className="skeleton h-4 w-20 rounded" />
    </div>
  );
}

function SkeletonSpanRow({ depth = 0 }: { depth?: number }) {
  const indent = depth * 20;
  return (
    <div className="flex items-center gap-3 py-2.5" style={{ paddingLeft: indent + 12 }}>
      <div className="skeleton h-3.5 w-3.5 rounded" />
      <div className="skeleton h-5 w-14 rounded-full" />
      <div className="skeleton h-3.5 rounded" style={{ width: `${90 + depth * 10}px` }} />
      <div className="ml-auto flex items-center gap-3">
        <div className="skeleton h-10 w-24 rounded" />
        <div className="skeleton h-3.5 w-12 rounded" />
      </div>
    </div>
  );
}

export default function TraceDetailLoading() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 mb-5">
        <div className="skeleton h-3 w-12 rounded" />
        <div className="skeleton h-3 w-3 rounded" />
        <div className="skeleton h-3 w-20 rounded" />
        <div className="skeleton h-3 w-3 rounded" />
        <div className="skeleton h-3 w-32 rounded" />
      </div>

      {/* Title + timestamp */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="skeleton h-6 w-48 rounded" />
        <div className="skeleton h-4 w-36 rounded" />
      </div>

      {/* Meta stats bar */}
      <div
        className="mb-6 flex flex-wrap gap-6 rounded-lg px-6 py-4"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonMetaStat key={i} />
        ))}
      </div>

      {/* Trace tree */}
      <div
        className="rounded-lg overflow-hidden"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        {/* Root span */}
        <div style={{ borderBottom: "1px solid var(--border)" }}>
          <SkeletonSpanRow depth={0} />
        </div>
        {/* Child spans at varying depths */}
        {[1, 1, 2, 2, 3, 1, 2].map((depth, i) => (
          <div key={i} style={{ borderBottom: "1px solid var(--border)" }}>
            <SkeletonSpanRow depth={depth} />
          </div>
        ))}
      </div>
    </div>
  );
}
