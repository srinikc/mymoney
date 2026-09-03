import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getRedisStatus } from "@/lib/redis"
import { getVersionInfo } from "@/lib/version"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Uptime Kuma / Better Uptime / Instatus compatible endpoint.
// Returns 200 with details if healthy, 503 if any service is down.

interface ServiceCheck {
  name: string
  status: "operational" | "degraded" | "down"
  latencyMs?: number
  message?: string
}

export async function GET() {
  const start = Date.now()
  const checks: ServiceCheck[] = []

  // Database
  try {
    const dbStart = Date.now()
    await prisma.$queryRaw`SELECT 1`
    checks.push({ name: "Database", status: "operational", latencyMs: Date.now() - dbStart })
  } catch (e) {
    checks.push({ name: "Database", status: "down", message: (e as Error).message })
  }

  // Redis
  const redisStart = Date.now()
  const redisStatus = getRedisStatus()
  checks.push({
    name: "Redis",
    status: redisStatus === "connected" ? "operational" : redisStatus === "disabled" ? "operational" : "degraded",
    latencyMs: Date.now() - redisStart,
    message: redisStatus,
  })

  const allOperational = checks.every((c) => c.status === "operational")
  const anyDown = checks.some((c) => c.status === "down")

  const version = getVersionInfo()
  const response = {
    status: anyDown ? "down" : allOperational ? "operational" : "degraded",
    version: version.version,
    build: version.buildNumber,
    sha: version.buildSha,
    timestamp: new Date().toISOString(),
    responseTimeMs: Date.now() - start,
    services: checks,
  }

  return NextResponse.json(response, { status: anyDown ? 503 : 200 })
}
