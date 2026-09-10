import { PageHeaderSkeleton } from "@/components/ui/page-skeleton"

export default function Loading() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeaderSkeleton />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-40 w-full animate-pulse rounded bg-muted" />
        ))}
      </div>
    </div>
  )
}