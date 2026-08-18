import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST() {
  // Auto-detect recurring expenses and create reminders
  const expenses = await prisma.expense.findMany({
    select: { vendor: true, amount: true },
    orderBy: { date: "desc" },
  })

  // Group by vendor+amount combo
  const groups = new Map<string, { vendor: string; amount: number; dates: Date[] }>()
  for (const e of expenses) {
    if (!e.vendor) continue
    const key = `${e.vendor.toLowerCase().trim()}|${e.amount}`
    if (!groups.has(key)) {
      groups.set(key, { vendor: e.vendor, amount: e.amount, dates: [] })
    }
  }

  // Check which patterns should be reminders (appears in different months)
  const patterns: Array<{ vendor: string; amount: number }> = []

  for (const [, group] of groups) {
    if (group.dates.length >= 3) {
      const months = new Set(group.dates.map((d) => `${d.getFullYear()}-${d.getMonth()}`))
      if (months.size >= 3) {
        patterns.push({ vendor: group.vendor, amount: group.amount })
      }
    }
  }

  let created = 0
  for (const p of patterns) {
    const existing = await prisma.reminder.findFirst({
      where: { merchantKey: p.vendor.toLowerCase().trim() },
    })
    if (!existing) {
      await prisma.reminder.create({
        data: {
          title: `${p.vendor} (₹${p.amount})`,
          description: `Auto-detected recurring expense`,
          type: "bill",
          priority: "normal",
          amount: p.amount,
          merchantKey: p.vendor.toLowerCase().trim(),
          recurring: "monthly",
        },
      })
      created++
    }
  }

  return NextResponse.json({ created, total: patterns.length })
}
