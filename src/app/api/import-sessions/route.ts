import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const sessions = await prisma.importSession.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  })
  return NextResponse.json(sessions)
}
