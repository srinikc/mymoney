import { CardGridSkeleton } from "@/components/ui/page-skeleton"

export default function Loading() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="space-y-2">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 w-full animate-pulse rounded bg-muted" />
        ))}
      </div>
      <CardGridSkeleton />
    </div>
  )
}
