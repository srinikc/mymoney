import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const liabilities = await prisma.liability.findMany({ orderBy: { createdAt: "desc" } })
  return NextResponse.json(liabilities)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const liability = await prisma.liability.create({
      data: {
        name: body.name,
        type: body.type || "other",
        amount: parseFloat(body.amount),
        interestRate: body.interestRate ? parseFloat(body.interestRate) : null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        notes: body.notes || null,
      },
    })
    return NextResponse.json(liability, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 400 })
  }
}
