import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const mappings = await prisma.merchantMapping.findMany({
    orderBy: [{ source: "asc" }, { merchantKey: "asc" }],
  })
  return NextResponse.json({ mappings, total: mappings.length })
}
