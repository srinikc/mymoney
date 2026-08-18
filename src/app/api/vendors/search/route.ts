import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"

export async function GET(req: Request) {
  let userId: number
  try {
    const ctx = await getAuthContext()
    userId = ctx.userId
  } catch (e) {
    return handleAuthError(e)
  }

  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q") || ""

  if (!q || q.length === 0) {
    return NextResponse.json({ results: [] })
  }

  const results = await prisma.vendorMapping.findMany({
    where: {
      userId,
      vendorKey: { contains: q.toLowerCase() },
    },
    take: 10,
    orderBy: { vendorKey: "asc" },
    select: {
      vendorKey: true,
      category: true,
      subCategory: true,
      person: true,
    },
  })

  return NextResponse.json({ results })
}
