import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const dates = await prisma.expense.findMany({
    select: { date: true },
    orderBy: { date: "asc" },
  })
  const currentYear = new Date().getFullYear()
  const years = [...new Set(dates.map((d) => d.date.getFullYear()))]
  if (!years.includes(currentYear)) years.push(currentYear)
  years.sort((a, b) => a - b)
  return NextResponse.json({ years })
}
