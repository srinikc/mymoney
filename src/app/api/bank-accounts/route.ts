import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const profileId = (session.user as unknown as { profileId?: number }).profileId

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

    return NextResponse.json({ accounts: enriched, totals })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const profileId = (session.user as unknown as { profileId?: number }).profileId

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
        notes: body.notes || null,
      },
    })

    return NextResponse.json(account, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
