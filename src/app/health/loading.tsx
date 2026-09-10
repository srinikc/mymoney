import { PageHeaderSkeleton } from "@/components/ui/page-skeleton"

export default function Loading() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <PageHeaderSkeleton />
      <div className="h-[300px] w-full animate-pulse rounded bg-muted" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-[200px] w-full animate-pulse rounded bg-muted" />
        <div className="h-[200px] w-full animate-pulse rounded bg-muted" />
      </div>
    </div>
  )
}
