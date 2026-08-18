import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext } from "@/lib/with-auth"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { profileId } = await getAuthContext()
    if (!profileId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const loan = await prisma.loan.findUnique({
      where: { id: Number.parseInt(id) },
    })

    if (!loan || loan.profileId !== profileId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json(loan)
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { profileId } = await getAuthContext()
    if (!profileId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const existing = await prisma.loan.findUnique({
      where: { id: Number.parseInt(id) },
    })

    if (!existing || existing.profileId !== profileId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const body = await req.json()
    const { name, type, principal, interestRate, tenureMonths, startDate, endDate, lender, notes } = body

    const r = (interestRate ?? existing.interestRate) / 12 / 100
    const n = tenureMonths ?? existing.tenureMonths
    const p = principal ?? existing.principal
    const emiAmount = p * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1)

    const loan = await prisma.loan.update({
      where: { id: Number.parseInt(id) },
      data: {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(principal !== undefined && { principal }),
        ...(interestRate !== undefined && { interestRate }),
        ...(tenureMonths !== undefined && { tenureMonths }),
        emiAmount,
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(lender !== undefined && { lender }),
        ...(notes !== undefined && { notes }),
      },
    })

    return NextResponse.json(loan)
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { profileId } = await getAuthContext()
    if (!profileId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const existing = await prisma.loan.findUnique({
      where: { id: Number.parseInt(id) },
    })

    if (!existing || existing.profileId !== profileId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    await prisma.loan.delete({
      where: { id: Number.parseInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
