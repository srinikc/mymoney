import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getVersionInfo } from "@/lib/version"
import { logger } from "@/lib/logger"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Composite health check used by uptime monitors (UptimeRobot, Better Stack,
// Datadog, Kubernetes liveness probes). Returns 200 if all subsystems OK,
// 503 if any are degraded.
//
// Liveness vs readiness:
//   GET /api/health          — liveness (is the process alive?)
//   GET /api/health/ready    — readiness (are dependencies OK?)
//
// This endpoint is liveness. Add /api/health/ready for k8s.

interface Subsystem {
  name: string
  status: "ok" | "degraded" | "down"
  latencyMs?: number
  detail?: string
}

async function checkDb(timeoutMs: number): Promise<Subsystem> {
  const start = Date.now()
  try {
    const result = await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), timeoutMs)),
    ])
    return {
      name: "database",
      status: "ok",
      latencyMs: Date.now() - start,
      detail: Array.isArray(result) ? "reachable" : "ok",
    }
  } catch (e) {
    return {
      name: "database",
      status: "down",
      latencyMs: Date.now() - start,
      detail: (e as Error).message,
    }
  }
}

async function checkRedis(): Promise<Subsystem> {
  const start = Date.now()
  try {
    const { getRedisClient } = await import("@/lib/redis")
    const client = getRedisClient()
    if (!client) {
      return { name: "redis", status: "degraded", latencyMs: Date.now() - start, detail: "disabled (in-memory fallback)" }
    }
    // Wait for Redis to be ready (up to 3s) before pinging
    if (client.status !== "ready") {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Redis not ready")), 3000)
        client.once("ready", () => { clearTimeout(timer); resolve() })
        client.once("error", (err: Error) => { clearTimeout(timer); reject(err) })
      })
    }
    const pong = await Promise.race([
      client.ping(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("ping timeout")), 2000)),
    ])
    return { name: "redis", status: "ok", latencyMs: Date.now() - start, detail: pong }
  } catch (e) {
    return { name: "redis", status: "degraded", latencyMs: Date.now() - start, detail: (e as Error).message }
  }
}

export async function GET() {
  const version = getVersionInfo()
  const checks = await Promise.all([
    checkDb(2000),
    checkRedis(),
  ])

  const allOk = checks.every((c) => c.status === "ok")
  const anyDown = checks.some((c) => c.status === "down")
  const httpStatus = allOk ? 200 : anyDown ? 503 : 200

  const response = {
    status: allOk ? "healthy" : anyDown ? "unhealthy" : "degraded",
    timestamp: new Date().toISOString(),
    version: `${version.version} (build ${version.buildNumber})`,
    buildSha: version.buildSha,
    uptimeSeconds: Math.floor(process.uptime()),
    checks,
  }

  if (!allOk) {
    logger.warn({ health: response }, "health check degraded")
  }

  return NextResponse.json(response, { status: httpStatus })
}
