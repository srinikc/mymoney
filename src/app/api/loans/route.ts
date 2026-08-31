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

export async function GET(_req: Request) {
  try {
    const { profileId } = await getAuthContext()
    if (!profileId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const loans = await prisma.loan.findMany({
      where: { profileId: profileId },
      orderBy: { createdAt: "desc" },
    })

    // Auto-update remaining amounts and status for EMI-active loans
    const now = new Date()
    const updates: Promise<unknown>[] = []
    const goalUpdates: Promise<unknown>[] = []
    for (const loan of loans) {
      if (loan.emiActive && loan.status === "active" && loan.emiStartDate && loan.emiFrequency) {
        const newRemaining = calculateRemainingAmount(
          loan.principal, loan.emiAmount, loan.emiActive, loan.emiStartDate, loan.emiFrequency,
        )
        if (newRemaining !== loan.remainingAmount) {
          const patch: Record<string, unknown> = { remainingAmount: newRemaining }
          if (newRemaining <= 0) {
            patch.status = "closed"
            patch.closedDate = now
            patch.remainingAmount = 0
            // Mark linked goal as achieved when loan auto-closes
            if (loan.linkedGoalId) {
              goalUpdates.push(prisma.goal.update({ where: { id: loan.linkedGoalId }, data: { status: "achieved" } }))
            }
          }
          updates.push(prisma.loan.update({ where: { id: loan.id }, data: patch }))
          Object.assign(loan, patch)
        }
      }
    }
    if (updates.length > 0) await Promise.all(updates)
    if (goalUpdates.length > 0) await Promise.all(goalUpdates)

    return NextResponse.json(loans)
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { profileId } = await getAuthContext()
    if (!profileId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const {
      name, type, principal, interestRate, tenureMonths, startDate, endDate,
      lender, notes, linkedGoalId,
      emiActive, emiStartDate, emiFrequency, remainingAmount, status, closedDate,
    } = body

    const r = interestRate / 12 / 100
    const n = tenureMonths
    const emiAmount = principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1)

    // Calculate remaining amount
    const initialRemaining = remainingAmount !== undefined && remainingAmount !== null
      ? Number(remainingAmount)
      : calculateRemainingAmount(
          principal, emiAmount,
          emiActive || false,
          emiStartDate ? new Date(emiStartDate) : null,
          emiFrequency || null,
        )

    const isClosed = status === "closed" || initialRemaining <= 0
    const finalStatus = isClosed ? "closed" : "active"
    const finalClosedDate = isClosed ? (closedDate ? new Date(closedDate) : new Date()) : null

    const loan = await prisma.loan.create({
      data: {
        profileId: profileId,
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
        linkedGoalId: linkedGoalId ? Number(linkedGoalId) : null,
        emiActive: emiActive || false,
        emiStartDate: emiStartDate ? new Date(emiStartDate) : null,
        emiFrequency: emiFrequency || null,
        remainingAmount: initialRemaining,
        status: finalStatus,
        closedDate: finalClosedDate,
      },
    })

    // Update linked goal if present
    if (linkedGoalId) {
      const goal = await prisma.goal.findUnique({ where: { id: Number(linkedGoalId) } })
      if (goal) {
        const loanAmount = principal
        const newCurrentAmount = goal.currentAmount + loanAmount
        const newStatus = goal.targetAmount > 0 && newCurrentAmount >= goal.targetAmount ? "achieved" : goal.status

        await prisma.goal.update({
          where: { id: goal.id },
          data: {
            currentAmount: newCurrentAmount,
            status: newStatus,
          },
        })
      }
    }

    return NextResponse.json(loan, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
