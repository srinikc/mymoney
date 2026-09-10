import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext } from "@/lib/with-auth"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const fds = await prisma.fixedDeposit.findMany({
      where: { bankAccountId: Number(id) },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json({ fixedDeposits: fds })
  } catch (error) {
    console.error("FDs GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { profileId } = await getAuthContext()
    // userId auto-checked by getAuthContext
    // profileId from getAuthContext
    const { id } = await params
    const body = await req.json()
    if (body.maturityDate && body.startDate && new Date(body.maturityDate) <= new Date(body.startDate)) {
      return NextResponse.json({ error: "Maturity date must be after start date" }, { status: 400 })
    }

    const fd = await prisma.fixedDeposit.create({
      data: {
        profileId: profileId || undefined,
        bankAccountId: Number(id),
        fdNumber: body.fdNumber || null,
        principal: body.principal ?? 0,
        interestRate: body.interestRate ?? 0,
        startDate: body.startDate ? new Date(body.startDate) : null,
        maturityDate: body.maturityDate ? new Date(body.maturityDate) : null,
        maturityAmount: body.maturityAmount ?? null,
        status: body.status || "active",
        notes: body.notes || null,
      },
    })

    // Link FD to a goal (100% allocation) via InvestmentGoalAllocation if goalId provided
    if (body.goalId) {
      const goalId = Number(body.goalId)
      const goal = await prisma.goal.findFirst({
        where: { id: goalId, profileId: profileId || undefined },
        select: { id: true },
      })
      if (goal) {
        const allocationValue = body.maturityAmount ?? body.principal ?? 0
        await prisma.investmentGoalAllocation.create({
          data: {
            fixedDepositId: fd.id,
            goalId,
            allocationPct: 100,
            allocationValue: Number(allocationValue),
            notes: body.notes || null,
          },
        })
      }
    }

    return NextResponse.json(fd, { status: 201 })
  } catch (error) {
    console.error("FDs POST error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
