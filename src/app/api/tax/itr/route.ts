import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/with-auth"

export async function GET(req: Request) {
    const auth = await withAuth()
  if (auth.error) return auth.error
  const { profileId } = auth
    const { searchParams } = new URL(req.url)
    const ay = searchParams.get("ay")

    const where: Record<string, unknown> = profileId ? { profileId } : {}
    if (ay) where.ay = ay

    const records = await prisma.iTRRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(records)
}

export async function POST(req: Request) {
    const auth = await withAuth()
  if (auth.error) return auth.error
  const { profileId, role } = auth
    if (role === "viewer") {
      return NextResponse.json({ error: "Viewers cannot modify data" }, { status: 403 })
    }

    const body = await req.json()
    const { ay, itrForm, status, filedDate, acknowledgmentNo, refundAmount, taxableIncome, taxLiability, tdsClaimed, notes } = body

    if (!ay || !itrForm || !status) {
      return NextResponse.json({ error: "AY, ITR form, and status are required" }, { status: 400 })
    }

    const existing = await prisma.iTRRecord.findFirst({
      where: { profileId: profileId ?? undefined, ay },
    })
    if (existing) {
      return NextResponse.json({ error: `ITR record for AY ${ay} already exists` }, { status: 409 })
    }

    const record = await prisma.iTRRecord.create({
      data: {
        profileId: profileId ?? undefined,
        ay,
        itrForm,
        status,
        filedDate: filedDate ? new Date(filedDate) : null,
        acknowledgmentNo,
        refundAmount: refundAmount ? Number(refundAmount) : null,
        taxableIncome: taxableIncome ? Number(taxableIncome) : null,
        taxLiability: taxLiability ? Number(taxLiability) : null,
        tdsClaimed: tdsClaimed ? Number(tdsClaimed) : null,
        notes,
      },
    })
    return NextResponse.json(record, { status: 201 })
}
