function Bar({ className = "" }) {
  return <div className={`animate-pulse rounded bg-lg ${className}`} />;
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
      <Bar className="h-3 w-20 mb-3" />
      <Bar className="h-8 w-24 mb-2" />
      <Bar className="h-3 w-16" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
      <div className="bg-off px-4 py-3 border-b border-border">
        <Bar className="h-3 w-48" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex gap-6 px-4 py-3 border-b border-border last:border-0"
        >
          <Bar className="h-4 w-32" />
          <Bar className="h-4 w-24" />
          <Bar className="h-4 w-16" />
          <Bar className="h-4 w-14 ml-auto" />
        </div>
      ))}
    </div>
  );
}
