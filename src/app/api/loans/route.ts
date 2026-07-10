import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionFromCookie } from "@/lib/auth"

export async function GET(req: Request) {
  try {
    const session = await getSessionFromCookie(req.headers.get("cookie"))
    if (!session?.user?.profileId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const loans = await prisma.loan.findMany({
      where: { profileId: session.user.profileId },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(loans)
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSessionFromCookie(req.headers.get("cookie"))
    if (!session?.user?.profileId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { name, type, principal, interestRate, tenureMonths, startDate, endDate, lender, notes } = body

    const r = interestRate / 12 / 100
    const n = tenureMonths
    const emiAmount = principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1)

    const loan = await prisma.loan.create({
      data: {
        profileId: session.user.profileId,
        name,
        type: type || "Other",
        principal,
        interestRate,
        tenureMonths,
        emiAmount,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        lender: lender || null,
        notes: notes || null,
      },
    })

    return NextResponse.json(loan, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
