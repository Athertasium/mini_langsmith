function SkeletonProjectCard() {
  return (
    <div
      className="rounded-xl px-5 py-4"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      {/* ID badge row */}
      <div className="mb-3 flex items-center justify-between">
        <div className="skeleton h-4 w-20 rounded" />
        <div className="skeleton h-2 w-2 rounded-full" />
      </div>
      {/* Name */}
      <div className="skeleton mb-1 h-4 w-3/4 rounded" />
      {/* Description */}
      <div className="skeleton mb-1 h-3 w-full rounded" />
      <div className="skeleton mb-3 h-3 w-2/3 rounded" />
      {/* Run count bar */}
      <div className="mt-3">
        <div className="mb-1 flex justify-between">
          <div className="skeleton h-3 w-16 rounded" />
          <div className="skeleton h-3 w-10 rounded" />
        </div>
        <div className="skeleton h-0.5 w-full rounded-full" />
      </div>
      {/* Footer */}
      <div className="mt-3 flex justify-between">
        <div className="skeleton h-3 w-20 rounded" />
      </div>
    </div>
  );
}

export default function ProjectsLoading() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      {/* Header */}
      <div className="mb-7 flex items-end justify-between">
        <div>
          <div className="skeleton mb-2 h-6 w-24 rounded" />
          <div className="skeleton h-3 w-64 rounded" />
        </div>
        <div className="skeleton h-5 w-16 rounded-full" />
      </div>

      {/* Project grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonProjectCard key={i} />
        ))}
      </div>

      {/* Create form panel */}
      <div
        className="rounded-xl px-5 py-5"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="skeleton h-3.5 w-3.5 rounded" />
          <div className="skeleton h-3 w-24 rounded" />
        </div>
        <div className="flex gap-3">
          <div className="skeleton h-8 flex-1 rounded-lg" />
          <div className="skeleton h-8 flex-1 rounded-lg" />
          <div className="skeleton h-8 w-20 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
