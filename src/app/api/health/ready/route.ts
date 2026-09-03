import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Readiness probe: used by k8s / load balancers to know if this instance
// is ready to serve traffic. Returns 200 only if all critical dependencies
// (database) are reachable. Should be lightweight — don't add heavy checks
// here, or your service won't pass health checks under load.

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ ready: true }, { status: 200 })
  } catch {
    return NextResponse.json({ ready: false }, { status: 503 })
  }
}
