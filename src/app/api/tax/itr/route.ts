import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { isViewer } from "@/lib/roles"

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const profileId = (session.user as unknown as { profileId?: number }).profileId
    const { searchParams } = new URL(req.url)
    const ay = searchParams.get("ay")

    const where: any = profileId ? { profileId } : {}
    if (ay) where.ay = ay

    const records = await prisma.iTRRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(records)
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (isViewer(session?.user as any)) {
      return NextResponse.json({ error: "Viewers cannot modify data" }, { status: 403 })
    }
    const profileId = (session.user as unknown as { profileId?: number }).profileId

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
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
