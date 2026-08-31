import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext } from "@/lib/with-auth"

function calculateRemainingAmount(
  principal: number,
  emiAmount: number,
  emiActive: boolean,
  emiStartDate: Date | null,
  emiFrequency: string | null,
): number {
  if (!emiActive || !emiStartDate || !emiFrequency || emiAmount <= 0) {
    return principal
  }
  const now = new Date()
  const start = new Date(emiStartDate)
  const monthsElapsed = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
  if (monthsElapsed <= 0) return principal
  const totalPaid = emiAmount * monthsElapsed
  return Math.max(0, Math.round((principal - totalPaid) * 100) / 100)
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { profileId } = await getAuthContext()
    if (!profileId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const loan = await prisma.loan.findUnique({
      where: { id: Number.parseInt(id) },
    })

    if (!loan || loan.profileId !== profileId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json(loan)
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { profileId } = await getAuthContext()
    if (!profileId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const existing = await prisma.loan.findUnique({
      where: { id: Number.parseInt(id) },
    })

    if (!existing || existing.profileId !== profileId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const body = await req.json()
    const {
      name, type, principal, interestRate, tenureMonths, startDate, endDate,
      lender, notes, linkedGoalId,
      emiActive, emiStartDate, emiFrequency, remainingAmount, status, closedDate,
    } = body

    const p = principal !== undefined ? Number(principal) : existing.principal
    const ir = interestRate !== undefined ? Number(interestRate) : existing.interestRate
    const tm = tenureMonths !== undefined ? Number(tenureMonths) : existing.tenureMonths

    const r = ir / 12 / 100
    const n = tm
    const emiAmount = p * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1)

    // Calculate remaining amount
    const newEmiActive = emiActive !== undefined ? emiActive : existing.emiActive
    const newEmiStartDate = emiStartDate !== undefined ? (emiStartDate ? new Date(emiStartDate) : null) : existing.emiStartDate
    const newEmiFrequency = emiFrequency !== undefined ? emiFrequency : existing.emiFrequency

    let newRemaining: number
    if (remainingAmount !== undefined && remainingAmount !== null) {
      newRemaining = Number(remainingAmount)
    } else {
      newRemaining = calculateRemainingAmount(
        p, emiAmount, newEmiActive, newEmiStartDate, newEmiFrequency,
      )
    }

    const newStatus = status !== undefined ? status : (newRemaining <= 0 ? "closed" : existing.status)
    const newClosedDate = closedDate !== undefined
      ? (closedDate ? new Date(closedDate) : null)
      : (newRemaining <= 0 && existing.status !== "closed" ? new Date() : existing.closedDate)

    const loan = await prisma.loan.update({
      where: { id: Number.parseInt(id) },
      data: {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(principal !== undefined && { principal: p }),
        ...(interestRate !== undefined && { interestRate: ir }),
        ...(tenureMonths !== undefined && { tenureMonths: tm }),
        emiAmount,
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(lender !== undefined && { lender }),
        ...(notes !== undefined && { notes }),
        ...(linkedGoalId !== undefined && { linkedGoalId: linkedGoalId ? Number(linkedGoalId) : null }),
        ...(emiActive !== undefined && { emiActive: newEmiActive }),
        ...(emiStartDate !== undefined && { emiStartDate: newEmiStartDate }),
        ...(emiFrequency !== undefined && { emiFrequency: newEmiFrequency }),
        remainingAmount: newRemaining,
        status: newStatus,
        closedDate: newClosedDate,
      },
    })

    // When loan is closed and has a linked goal, mark goal as achieved
    if (newStatus === "closed" && existing.status !== "closed") {
      const goalId = loan.linkedGoalId || existing.linkedGoalId
      if (goalId) {
        await prisma.goal.update({
          where: { id: goalId },
          data: { status: "achieved" },
        })
      }
    }

    return NextResponse.json(loan)
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { profileId } = await getAuthContext()
    if (!profileId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const existing = await prisma.loan.findUnique({
      where: { id: Number.parseInt(id) },
    })

    if (!existing || existing.profileId !== profileId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    await prisma.loan.delete({
      where: { id: Number.parseInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
