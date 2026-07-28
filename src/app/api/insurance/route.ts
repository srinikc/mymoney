import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(_req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.profileId) {
      return NextResponse.json([], { status: 200 })
    }
    const insurance = await prisma.insurance.findMany({
      where: { profileId: session.user.profileId },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(insurance)
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.profileId) {
      return NextResponse.json({ error: "Internal server error" }, { status: 401 })
    }
    const body = await req.json()
    const insurance = await prisma.insurance.create({
      data: {
        profileId: session.user.profileId,
        name: body.name,
        type: body.type || "Other",
        provider: body.provider || null,
        policyNumber: body.policyNumber || null,
        sumAssured: body.sumAssured ? Number.parseFloat(body.sumAssured) : null,
        premium: Number.parseFloat(body.premium),
        premiumFrequency: body.premiumFrequency || "yearly",
        startDate: new Date(body.startDate),
        renewalDate: body.renewalDate ? new Date(body.renewalDate) : null,
        nominee: body.nominee || null,
        notes: body.notes || null,
      },
    })
    return NextResponse.json(insurance, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
