import { NextResponse } from "next/server"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"
import { computeSpendingIntelligence, type IntelligenceItem } from "@/shared/spending-intelligence"
import { cached, CACHE_TTL, CacheKeys, invalidateProfile } from "@/lib/cache"

export async function GET() {
  try {
    const ctx = await getAuthContext()
    // Phase 2 of scaling_perf.md: cache intelligence per-profile.
    // 5-minute TTL is plenty — insights don't change minute-to-minute,
    // but stale data is invalidated on any expense write.
    const result = await cached(
      CacheKeys.intelligence(ctx.profileId),
      CACHE_TTL.INTELLIGENCE,
      async () => {
        const items: IntelligenceItem[] = await computeSpendingIntelligence(ctx.profileId)
        const counts = {
          info: items.filter((i) => i.severity === "info").length,
          warn: items.filter((i) => i.severity === "warn").length,
          alert: items.filter((i) => i.severity === "alert").length,
        }
        return {
          items,
          total: items.length,
          counts,
          generatedAt: new Date().toISOString(),
        }
      },
    )
    return NextResponse.json(result)
  } catch (e) {
    return handleAuthError(e)
  }
}
