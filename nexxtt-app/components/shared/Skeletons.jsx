function Bar({ className = "" }) {
  return <div className={`animate-pulse rounded bg-lg ${className}`} />;
}

export function PageSkeleton({ stats = 4, rows = 6 }) {
  return (
    <main className="flex-1 px-4 sm:px-6 lg:px-8 py-5 lg:py-7">
      <div className="mb-6">
        <Bar className="h-3 w-24 mb-2" />
        <Bar className="h-7 w-64" />
      </div>
      {stats > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: stats }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      )}
      <TableSkeleton rows={rows} />
    </main>
  );
}

export function DetailSkeleton() {
  return (
    <main className="flex-1 px-4 sm:px-6 lg:px-8 py-5 lg:py-7">
      <Bar className="h-3 w-32 mb-2" />
      <Bar className="h-8 w-80 mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
            <Bar className="h-4 w-40 mb-4" />
            <Bar className="h-3 w-full mb-2" />
            <Bar className="h-3 w-5/6 mb-2" />
            <Bar className="h-3 w-3/4" />
          </div>
          <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
            <Bar className="h-4 w-32 mb-4" />
            <Bar className="h-24 w-full" />
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      </div>
    </main>
  );
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
