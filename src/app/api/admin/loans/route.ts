import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { requireRole, type AuthUser } from "@/lib/roles"
import { cached, CACHE_TTL, CacheKeys, cacheDel } from "@/lib/cache"

export const runtime = "nodejs"

export async function GET() {
  const session = await auth()
  const forbid = requireRole(session?.user as AuthUser, "admin")
  if (forbid) return forbid

  const result = await cached(CacheKeys.adminLoans(), CACHE_TTL.SHORT, async () => {
    return prisma.loanProduct.findMany({
      orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
    })
  })
  return NextResponse.json({ products: result })
}

export async function POST(req: Request) {
  const session = await auth()
  const forbid = requireRole(session?.user as AuthUser, "admin")
  if (forbid) return forbid

  try {
    const body = (await req.json()) as {
      bankName: string
      productName: string
      loanType: string
      interestRateMin: number
      interestRateMax: number
      maxAmount?: number
      tenureMonths?: number
      processingFee?: string
      features?: string[]
      affiliateUrl: string
      affiliateNetwork?: string
      isSponsored?: boolean
      displayOrder?: number
    }

    if (!body.bankName || !body.productName || !body.loanType || !body.affiliateUrl) {
      return NextResponse.json({ error: "missing required fields" }, { status: 400 })
    }

    const created = await prisma.loanProduct.create({
      data: {
        bankName: body.bankName,
        productName: body.productName,
        loanType: body.loanType,
        interestRateMin: body.interestRateMin,
        interestRateMax: body.interestRateMax,
        maxAmount: body.maxAmount,
        tenureMonths: body.tenureMonths,
        processingFee: body.processingFee,
        features: body.features ? JSON.stringify(body.features) : null,
        affiliateUrl: body.affiliateUrl,
        affiliateNetwork: body.affiliateNetwork ?? "direct",
        isSponsored: body.isSponsored ?? false,
        isActive: true,
        displayOrder: body.displayOrder ?? 0,
      },
    })
    return NextResponse.json({ ok: true, product: created })
    await cacheDel(CacheKeys.adminLoans())
  } catch (e) {
    console.error("admin loans POST error:", e)
    return NextResponse.json({ error: "internal error" }, { status: 500 })
  }
}
