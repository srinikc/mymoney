import { InsightsSkeleton } from "@/components/ui/page-skeleton"

export default function Loading() {
  return (
    <div className="p-4 md:p-6">
      <InsightsSkeleton />
    </div>
  )
}