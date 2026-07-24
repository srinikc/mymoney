import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const admin = await prisma.user.findFirst({
      where: { role: "admin" },
      select: { id: true },
    })
    return NextResponse.json({ hasAdmin: !!admin })
  } catch {
    return NextResponse.json({ hasAdmin: false })
  }
}
