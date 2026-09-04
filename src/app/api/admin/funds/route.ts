import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { requireRole, type AuthUser } from "@/lib/roles"

export const runtime = "nodejs"

export async function GET() {
  const session = await auth()
  const forbid = requireRole(session?.user as AuthUser, "admin")
  if (forbid) return forbid

  // Check if FundMetadata table exists
  let tableExists = true
  try {
    await prisma.$queryRaw`SELECT 1 FROM "FundMetadata" LIMIT 1`
  } catch {
    tableExists = false
  }

  if (!tableExists) {
    return NextResponse.json({ funds: [] })
  }

  const funds = await prisma.fundMetadata.findMany({
    where: { isCurated: true },
    orderBy: { aiScore: "desc" },
  })
  return NextResponse.json({ funds })
}
