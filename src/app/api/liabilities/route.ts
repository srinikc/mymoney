import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/with-auth"

export async function GET() {
  const auth = await withAuth()
  if (auth.error) return auth.error
  const { profileId } = auth
  const liabilities = await prisma.liability.findMany({ where: { profileId }, orderBy: { createdAt: "desc" } })
  return NextResponse.json(liabilities)
}

export async function POST(req: Request) {
  const auth = await withAuth()
  if (auth.error) return auth.error
  const { profileId } = auth
  try {
    const body = await req.json()
    const liability = await prisma.liability.create({
      data: {
        profileId,
        name: body.name,
        type: body.type || "other",
        amount: Number.parseFloat(body.amount),
        interestRate: body.interestRate ? Number.parseFloat(body.interestRate) : null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        notes: body.notes || null,
      },
    })
    return NextResponse.json(liability, { status: 201 })
  } catch (error) {
    console.error("Liability create error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 400 })
  }
}
