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

export default function PathsLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <SkeletonSubNav />

      {/* Header */}
      <div className="mb-6">
        <div className="skeleton mb-2 h-6 w-40 rounded" />
        <div className="skeleton h-3.5 w-72 rounded" />
      </div>

      {/* Date range buttons */}
      <div className="mb-6 flex gap-1">
        {[80, 90, 60].map((w, i) => (
          <div key={i} className="skeleton h-7 rounded" style={{ width: w }} />
        ))}
      </div>

      {/* Sankey diagram box */}
      <div
        className="rounded-lg p-4"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        {/* Nodes and stream placeholders */}
        <div className="relative" style={{ height: 480 }}>
          {/* Left column nodes */}
          {[60, 120, 200, 290, 380].map((top, i) => (
            <div
              key={`l${i}`}
              className="skeleton absolute rounded"
              style={{ left: 0, top, width: 120, height: 36 }}
            />
          ))}
          {/* Middle column nodes */}
          {[80, 180, 300].map((top, i) => (
            <div
              key={`m${i}`}
              className="skeleton absolute rounded"
              style={{ left: "38%", top, width: 110, height: 36 }}
            />
          ))}
          {/* Right column nodes */}
          {[100, 220, 340].map((top, i) => (
            <div
              key={`r${i}`}
              className="skeleton absolute rounded"
              style={{ right: 0, top, width: 120, height: 36 }}
            />
          ))}
          {/* Stream bands — just faint wide bars */}
          {[90, 190, 310].map((top, i) => (
            <div
              key={`s${i}`}
              className="skeleton absolute rounded"
              style={{ left: "14%", top: top - 6, width: "72%", height: 20, opacity: 0.4 }}
            />
          ))}
        </div>
      </div>

      <div className="mt-4">
        <div className="skeleton h-3 w-96 rounded" />
      </div>
    </div>
  );
}
