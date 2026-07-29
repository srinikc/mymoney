import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { profileId, userId, role } = await getAuthContext()
    // userId auto-checked by getAuthContext
    const { id } = await params

    const account = await prisma.bankAccount.findUnique({
      where: { id: Number(id) },
      include: { fixedDeposits: true },
    })
    if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 })

    return NextResponse.json(account)
  } catch (error) {
    console.error("Bank account GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { profileId, userId, role } = await getAuthContext()
    // userId auto-checked by getAuthContext
    const { id } = await params
    const body = await req.json()

    const account = await prisma.bankAccount.update({
      where: { id: Number(id) },
      data: {
        name: body.name,
        bankName: body.bankName,
        accountNumber: body.accountNumber,
        type: body.type,
        ifscCode: body.ifscCode,
        branch: body.branch,
        balance: body.balance,
        notes: body.notes,
      },
    })

    return NextResponse.json(account)
  } catch (error) {
    console.error("Bank account PUT error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { profileId, userId, role } = await getAuthContext()
    // userId auto-checked by getAuthContext
    const { id } = await params

    await prisma.bankAccount.delete({ where: { id: Number(id) } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Bank account DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
