import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { requireRole, type AuthUser } from "@/lib/roles"
import { cached, CACHE_TTL, CacheKeys } from "@/lib/cache"

export const runtime = "nodejs"

export async function GET() {
  const session = await auth()
  const forbid = requireRole(session?.user as AuthUser, "admin")
  if (forbid) return forbid

  const result = await cached(CacheKeys.adminFunds(), CACHE_TTL.SHORT, async () => {
    let tableExists = true
    try {
      await prisma.$queryRaw`SELECT 1 FROM "FundMetadata" LIMIT 1`
    } catch {
      tableExists = false
    }
    if (!tableExists) return []
    return prisma.fundMetadata.findMany({
      where: { isCurated: true },
      orderBy: { aiScore: "desc" },
    })
  })
  return NextResponse.json({ funds: result })
}
