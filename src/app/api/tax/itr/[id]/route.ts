import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { isViewer, type AuthUser } from "@/lib/roles"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const profileId = (session.user as unknown as { profileId?: number }).profileId
    const { id } = await params
    const record = await prisma.iTRRecord.findFirst({
      where: { id: Number(id), ...(profileId ? { profileId } : {}) },
    })
    if (!record) {
      return NextResponse.json({ error: "ITR record not found" }, { status: 404 })
    }
    return NextResponse.json(record)
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (isViewer(session?.user as AuthUser)) {
      return NextResponse.json({ error: "Viewers cannot modify data" }, { status: 403 })
    }
    const profileId = (session.user as unknown as { profileId?: number }).profileId
    const { id } = await params
    const existing = await prisma.iTRRecord.findFirst({
      where: { id: Number(id), ...(profileId ? { profileId } : {}) },
    })
    if (!existing) {
      return NextResponse.json({ error: "ITR record not found" }, { status: 404 })
    }
    const body = await req.json()
    const record = await prisma.iTRRecord.update({
      where: { id: existing.id },
      data: {
        itrForm: body.itrForm ?? undefined,
        status: body.status ?? undefined,
        filedDate: body.filedDate ? new Date(body.filedDate) : body.filedDate === null ? null : undefined,
        acknowledgmentNo: body.acknowledgmentNo ?? undefined,
        refundAmount: body.refundAmount ? Number(body.refundAmount) : body.refundAmount === null ? null : undefined,
        taxableIncome: body.taxableIncome ? Number(body.taxableIncome) : body.taxableIncome === null ? null : undefined,
        taxLiability: body.taxLiability ? Number(body.taxLiability) : body.taxLiability === null ? null : undefined,
        tdsClaimed: body.tdsClaimed ? Number(body.tdsClaimed) : body.tdsClaimed === null ? null : undefined,
        notes: body.notes ?? undefined,
      },
    })
    return NextResponse.json(record)
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
