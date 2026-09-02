import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { getUserConsent } from "@/lib/consent"

export const runtime = "nodejs"

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }
    const userId = Number((session.user as { id?: number }).id)
    if (!userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    // Check consent
    const consent = await getUserConsent(userId)
    if (!consent.showPersonalizedRecs) {
      return NextResponse.json({ loans: [], personalized: false })
    }

    const { searchParams } = new URL(req.url)
    const loanType = searchParams.get("loanType")
    const onlySponsored = searchParams.get("sponsored") === "true"

    const where: {
      isActive: boolean
      loanType?: string
      isSponsored?: boolean
    } = { isActive: true }
    if (loanType) where.loanType = loanType
    if (onlySponsored) where.isSponsored = true

    const products = await prisma.loanProduct.findMany({
      where,
      orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
    })

    return NextResponse.json({
      loans: products.map((p) => ({
        id: p.id,
        bankName: p.bankName,
        productName: p.productName,
        loanType: p.loanType,
        interestRateMin: Number(p.interestRateMin),
        interestRateMax: Number(p.interestRateMax),
        maxAmount: p.maxAmount ? Number(p.maxAmount) : 0,
        tenureMonths: p.tenureMonths,
        processingFee: p.processingFee,
        features: p.features ? (JSON.parse(p.features) as string[]) : [],
        affiliateUrl: p.affiliateUrl,
        isSponsored: p.isSponsored,
        displayOrder: p.displayOrder,
      })),
      personalized: true,
    })
  } catch (e) {
    console.error("loans recommendations error:", e)
    return NextResponse.json({ error: "internal error" }, { status: 500 })
  }
}
