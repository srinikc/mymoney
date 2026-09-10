export default function Loading() {
  return (
    <div className="space-y-4 max-w-6xl mx-auto p-4 md:p-6">
      <div className="space-y-2">
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        <div className="h-4 w-96 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 w-full animate-pulse rounded bg-muted" />
        ))}
      </div>
      <div className="h-64 w-full animate-pulse rounded bg-muted" />
    </div>
  )
}