import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { logAudit } from "@/shared/middleware/audit"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const sUser = session.user as unknown as { profileId?: number }
  const profileId = sUser.profileId
  if (!profileId) {
    return NextResponse.json({ error: "No profile found" }, { status: 400 })
  }

  const [
    expenses,
    incomeSources,
    budgets,
    goals,
    investments,
    insurance,
    loans,
    assets,
    liabilities,
    subscriptions,
    reminders,
    deals,
    bankAccounts,
    fixedDeposits,
    taxDocuments,
    itrRecords,
    auditEntries,
  ] = await Promise.all([
    prisma.expense.findMany({ where: { profileId } }),
    prisma.incomeSource.findMany({ where: { profileId } }),
    prisma.budget.findMany({ where: { profileId } }),
    prisma.goal.findMany({ where: { profileId } }),
    prisma.investment.findMany({ where: { profileId } }),
    prisma.insurance.findMany({ where: { profileId } }),
    prisma.loan.findMany({ where: { profileId } }),
    prisma.asset.findMany({ where: { profileId } }),
    prisma.liability.findMany({ where: { profileId } }),
    prisma.subscription.findMany({ where: { profileId } }),
    prisma.reminder.findMany({ where: { profileId } }),
    prisma.deal.findMany({ where: { profileId } }),
    prisma.bankAccount.findMany({ where: { profileId } }),
    prisma.fixedDeposit.findMany({ where: { profileId } }),
    prisma.taxDocument.findMany({ where: { profileId } }),
    prisma.iTRRecord.findMany({ where: { profileId } }),
    prisma.auditLog.findMany({ where: { profileId }, orderBy: { createdAt: "desc" }, take: 1000 }),
  ])

  await logAudit(profileId, "export", "profile", null, "User exported all their data")

  const exportData = {
    exportedAt: new Date().toISOString(),
    profileId,
    expenses,
    incomeSources,
    budgets,
    goals,
    investments,
    insurance,
    loans,
    assets,
    liabilities,
    subscriptions,
    reminders,
    deals,
    bankAccounts,
    fixedDeposits,
    taxDocuments,
    itrRecords,
    recentAuditLog: auditEntries,
  }

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="mymoney-export-${new Date().toISOString().split("T")[0]}.json"`,
    },
  })
}
