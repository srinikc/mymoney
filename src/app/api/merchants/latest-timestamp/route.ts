import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const result = await prisma.merchantMapping.aggregate({
    _max: { updatedAt: true },
  })
  return NextResponse.json({ latestUpdatedAt: result._max.updatedAt })
}
