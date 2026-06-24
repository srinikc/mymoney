import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q") || ""

  if (!q || q.length < 1) {
    return NextResponse.json({ results: [] })
  }

  const results = await prisma.merchantMapping.findMany({
    where: {
      merchantKey: { contains: q.toLowerCase() },
    },
    take: 10,
    orderBy: { merchantKey: "asc" },
    select: {
      merchantKey: true,
      expenseType: true,
      subCategory: true,
      person: true,
    },
  })

  return NextResponse.json({ results })
}
