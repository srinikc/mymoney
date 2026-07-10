import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionFromCookie } from "@/lib/auth"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getSessionFromCookie(req.headers.get("cookie"))
    if (!session?.user?.profileId) {
      return NextResponse.json({ error: "Internal server error" }, { status: 401 })
    }
    const insurance = await prisma.insurance.findUnique({
      where: { id: Number.parseInt(id) },
    })
    if (!insurance || insurance.profileId !== session.user.profileId) {
      return NextResponse.json({ error: "Internal server error" }, { status: 404 })
    }
    return NextResponse.json(insurance)
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getSessionFromCookie(req.headers.get("cookie"))
    if (!session?.user?.profileId) {
      return NextResponse.json({ error: "Internal server error" }, { status: 401 })
    }
    const existing = await prisma.insurance.findUnique({
      where: { id: Number.parseInt(id) },
    })
    if (!existing || existing.profileId !== session.user.profileId) {
      return NextResponse.json({ error: "Internal server error" }, { status: 404 })
    }
    const body = await req.json()
    const insurance = await prisma.insurance.update({
      where: { id: Number.parseInt(id) },
      data: {
        name: body.name ?? existing.name,
        type: body.type ?? existing.type,
        provider: body.provider !== undefined ? body.provider : existing.provider,
        policyNumber: body.policyNumber !== undefined ? body.policyNumber : existing.policyNumber,
        sumAssured: body.sumAssured !== undefined ? (body.sumAssured ? Number.parseFloat(body.sumAssured) : null) : existing.sumAssured,
        premium: body.premium !== undefined ? Number.parseFloat(body.premium) : existing.premium,
        premiumFrequency: body.premiumFrequency ?? existing.premiumFrequency,
        startDate: body.startDate ? new Date(body.startDate) : existing.startDate,
        renewalDate: body.renewalDate !== undefined ? (body.renewalDate ? new Date(body.renewalDate) : null) : existing.renewalDate,
        nominee: body.nominee !== undefined ? body.nominee : existing.nominee,
        notes: body.notes !== undefined ? body.notes : existing.notes,
      },
    })
    return NextResponse.json(insurance)
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getSessionFromCookie(req.headers.get("cookie"))
    if (!session?.user?.profileId) {
      return NextResponse.json({ error: "Internal server error" }, { status: 401 })
    }
    const existing = await prisma.insurance.findUnique({
      where: { id: Number.parseInt(id) },
    })
    if (!existing || existing.profileId !== session.user.profileId) {
      return NextResponse.json({ error: "Internal server error" }, { status: 404 })
    }
    await prisma.insurance.delete({ where: { id: Number.parseInt(id) } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
