/** Skeleton shown while a dashboard route's server data resolves. */
export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-48 rounded bg-bg-elevated" />
        <div className="h-4 w-80 rounded bg-bg-elevated/70" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl border border-border bg-bg-elevated/60" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="h-64 rounded-xl border border-border bg-bg-elevated/60" />
        <div className="h-64 rounded-xl border border-border bg-bg-elevated/60 lg:col-span-2" />
      </div>

      <div className="h-48 rounded-xl border border-border bg-bg-elevated/60" />
    </div>
  );
}
