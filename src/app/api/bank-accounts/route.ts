import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/with-auth"
import { cached, CACHE_TTL, CacheKeys, cacheDel } from "@/lib/cache"

export async function GET() {
    const auth = await withAuth()
  if (auth.error) return auth.error
  const { profileId } = auth

  const result = await cached(CacheKeys.bankAccounts(profileId), CACHE_TTL.SHORT, async () => {
    const accounts = await prisma.bankAccount.findMany({
      where: profileId ? { profileId } : {},
      include: { fixedDeposits: true },
      orderBy: { createdAt: "desc" },
    })

    const enriched = accounts.map((a) => ({
      ...a,
      transactionCount: 0,
      lastTransaction: null,
    }))

    const totals = accounts.reduce(
      (s, a) => ({ balance: s.balance + a.balance, fdValue: s.fdValue + a.fixedDeposits.reduce((fs, f) => fs + f.principal, 0) }),
      { balance: 0, fdValue: 0 }
    )

    return { accounts: enriched, totals }
  })

  return NextResponse.json(result)
}

export async function POST(req: Request) {
    const auth = await withAuth()
  if (auth.error) return auth.error
  const { profileId } = auth

    const body = await req.json()
    if (!body.bankName?.trim()) return NextResponse.json({ error: "Bank name is required" }, { status: 400 })

    const account = await prisma.bankAccount.create({
      data: {
        profileId: profileId || undefined,
        name: body.name || body.bankName,
        bankName: body.bankName,
        accountNumber: body.accountNumber || null,
        type: body.type || "savings",
        ifscCode: body.ifscCode || null,
        branch: body.branch || null,
        balance: body.balance ?? 0,
        currency: body.currency || "INR",
        source: "manual",
        isEmergencyFund: body.isEmergencyFund ?? false,
        notes: body.notes || null,
      },
    })

    // Invalidate cached account lists / net worth / health score
    if (profileId) {
      await cacheDel(CacheKeys.bankAccounts(profileId))
      await cacheDel(CacheKeys.netWorth(profileId))
      await cacheDel(CacheKeys.cashBalance(profileId))
      await cacheDel(CacheKeys.healthScore(profileId))
    }

    return NextResponse.json(account, { status: 201 })
}
