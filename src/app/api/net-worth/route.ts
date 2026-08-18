import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/with-auth"

export async function GET() {
  const auth = await withAuth()
  if (auth.error) return auth.error
  const { profileId } = auth

  const [assets, liabilities, investments, bankAccounts, fixedDeposits] = await Promise.all([
    prisma.asset.findMany({ where: { profileId }, select: { currentValue: true } }),
    prisma.liability.findMany({ where: { profileId }, select: { amount: true } }),
    prisma.investment.findMany({ where: { profileId }, select: { currentValue: true } }),
    prisma.bankAccount.findMany({ where: { profileId }, select: { balance: true } }),
    prisma.fixedDeposit.findMany({ where: { profileId }, select: { maturityAmount: true, principal: true } }),
  ])

  const totalAssets = assets.reduce((s, a) => s + a.currentValue, 0)
  const totalLiabilities = liabilities.reduce((s, l) => s + l.amount, 0)
  const totalInvestments = investments.reduce((s, i) => s + i.currentValue, 0)
  const totalBankBalance = bankAccounts.reduce((s, b) => s + b.balance, 0)
  const totalFDs = fixedDeposits.reduce((s, f) => s + (f.maturityAmount ?? f.principal), 0)

  const grandTotalAssets = totalAssets + totalInvestments + totalBankBalance + totalFDs

  return NextResponse.json({
    totalAssets: grandTotalAssets,
    totalLiabilities,
    netWorth: grandTotalAssets - totalLiabilities,
    breakdown: {
      userAssets: totalAssets,
      investments: totalInvestments,
      bankBalance: totalBankBalance,
      fixedDeposits: totalFDs,
    },
  })
}