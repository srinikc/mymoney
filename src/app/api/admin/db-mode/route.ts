import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { auth } from "@/lib/auth"
import { requireRole, type AuthUser } from "@/lib/roles"
import { getDbMode, setDbMode, getTestDatabaseUrl, resetDbModeCache } from "@/lib/db-config"

export async function GET() {
  const session = await auth()
  const forbid = requireRole(session?.user as AuthUser, "admin")
  if (forbid) return forbid

  return NextResponse.json({
    mode: getDbMode(),
    testDatabaseConfigured: !!process.env.TEST_DATABASE_URL,
  })
}

export async function PUT(req: Request) {
  const session = await auth()
  const forbid = requireRole(session?.user as AuthUser, "admin")
  if (forbid) return forbid

  const body = await req.json()
  const { mode } = body as { mode: string }

  if (mode !== "production" && mode !== "test") {
    return NextResponse.json({ error: "Mode must be 'production' or 'test'" }, { status: 400 })
  }

  if (mode === "test" && !process.env.TEST_DATABASE_URL) {
    return NextResponse.json({ error: "TEST_DATABASE_URL is not configured" }, { status: 400 })
  }

  // Test connection to the target database BEFORE switching
  const targetUrl = mode === "test" ? getTestDatabaseUrl() : process.env.DATABASE_URL
  if (!targetUrl) {
    return NextResponse.json({ error: `No ${mode === "test" ? "TEST_DATABASE_URL" : "DATABASE_URL"} configured` }, { status: 400 })
  }

  let testClient: PrismaClient | null = null
  try {
    testClient = new PrismaClient({ datasources: { db: { url: targetUrl } } })
    await testClient.$queryRaw`SELECT 1 AS ok`
    await testClient.$disconnect()
    testClient = null
  } catch (err) {
    if (testClient) await testClient.$disconnect().catch(() => {})
    console.error("Database connection error:", err)
    return NextResponse.json({ error: `Cannot connect to ${mode} database` }, { status: 502 })
  }

  // Connection verified — switch mode
  setDbMode(mode)
  resetDbModeCache()

  return NextResponse.json({
    mode,
    verified: true,
    message: `Successfully switched to ${mode === "test" ? "Test" : "Production"} database`,
  })
}
