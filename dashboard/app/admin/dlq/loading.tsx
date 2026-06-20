function SkeletonDlqRow() {
  return (
    <div
      className="rounded-lg"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-4 px-4 py-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="skeleton h-5 w-12 rounded" />
            <div className="skeleton h-3.5 w-36 rounded" />
            <div className="skeleton h-3.5 w-24 rounded" />
          </div>
          <div className="mt-1.5 skeleton h-3 w-64 rounded" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="skeleton h-6 w-12 rounded" />
          <div className="skeleton h-6 w-16 rounded" />
        </div>
      </div>
    </div>
  );
}

export default function DlqLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      {/* Header */}
      <div className="mb-6">
        <div className="skeleton mb-2 h-6 w-44 rounded" />
        <div className="skeleton mb-1 h-3.5 w-full max-w-lg rounded" />
        <div className="skeleton h-3.5 w-80 rounded" />
      </div>

      {/* Count + refresh row */}
      <div className="mb-4 flex items-center justify-between">
        <div className="skeleton h-3.5 w-28 rounded" />
        <div className="skeleton h-6 w-16 rounded" />
      </div>

      {/* DLQ entry rows */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonDlqRow key={i} />
        ))}
      </div>
    </div>
  );
}
