import { NextResponse } from "next/server"
import { TIER_LIMITS, ROUTE_LIMITS } from "@/shared/middleware/rate-limit-config"

// Phase 3 observability: returns the active rate-limit configuration so
// operators can verify the rules without reading the source.
export async function GET() {
  return NextResponse.json({
    tierLimits: TIER_LIMITS,
    routeLimits: ROUTE_LIMITS,
    note: "Per-tier limit applies first. Per-route limit applies as a stricter cap on top of the per-tier limit. Both must pass for the request to proceed.",
    enabled: process.env.NODE_ENV === "production",
    timestamp: new Date().toISOString(),
  })
}
