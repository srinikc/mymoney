import { prisma } from "@/lib/prisma"

export type IntelligenceKind =
  | "anomaly"
  | "velocity"
  | "subscription"
  | "tax-optimization"
  | "lifestyle-creep"
  | "seasonal"
  | "weekend-effect"

export interface IntelligenceItem {
  id: string
  kind: IntelligenceKind
  title: string
  description: string
  metric: string
  severity: "info" | "warn" | "alert"
  actionable: string
  data?: Record<string, unknown>
}

function monthsAgo(n: number): Date {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  return d
}

export async function computeSpendingIntelligence(profileId: number): Promise<IntelligenceItem[]> {
  const items: IntelligenceItem[] = []
  let counter = 0
  const nextId = () => `si-${++counter}`

  // ── Anomaly: unusually large transactions ──────────────────────────
  const last3Months = monthsAgo(3)
  const recentExpenses = await prisma.expense.findMany({
    where: { profileId, deletedAt: null, date: { gte: last3Months }, isUnusual: true },
    orderBy: { amount: "desc" },
    take: 10,
    select: { id: true, amount: true, vendor: true, date: true, purpose: true },
  })
  if (recentExpenses.length > 0) {
    const top = recentExpenses[0]
    items.push({
      id: nextId(),
      kind: "anomaly",
      title: `${recentExpenses.length} unusual transaction${recentExpenses.length === 1 ? "" : "s"} this quarter`,
      description: `Largest: ${top.vendor || "Unnamed"} on ${top.date.toISOString().slice(0, 10)} for ₹${Math.round(top.amount).toLocaleString("en-IN")}.${top.purpose ? ` Purpose: ${top.purpose}.` : " Not yet tagged."}`,
      metric: `${recentExpenses.length} flags`,
      severity: recentExpenses.length > 5 ? "alert" : "warn",
      actionable: "Tag purposes to enable better insights.",
    })
  }

  // ── Velocity: spending pace vs last month ──────────────────────────
  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = thisMonthStart

  const [thisAgg, lastAgg] = await Promise.all([
    prisma.expense.aggregate({
      where: { profileId, deletedAt: null, date: { gte: thisMonthStart } },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { profileId, deletedAt: null, date: { gte: lastMonthStart, lt: lastMonthEnd } },
      _sum: { amount: true },
    }),
  ])
  const thisMonth = thisAgg._sum.amount || 0
  const lastMonth = lastAgg._sum.amount || 0

  if (lastMonth > 0) {
    const daysElapsed = now.getDate()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const projectedThisMonth = (thisMonth / daysElapsed) * daysInMonth
    const change = ((projectedThisMonth - lastMonth) / lastMonth) * 100

    if (change > 15 && daysElapsed >= 10) {
      items.push({
        id: nextId(),
        kind: "velocity",
        title: "Spending pace is up this month",
        description: `At this rate, you'll spend ${change.toFixed(0)}% more than last month (₹${Math.round(projectedThisMonth).toLocaleString("en-IN")} vs ₹${Math.round(lastMonth).toLocaleString("en-IN")}).`,
        metric: `+${change.toFixed(0)}% pace`,
        severity: change > 30 ? "alert" : "warn",
        actionable: "Review top categories and cut non-essentials.",
        data: { thisMonth, lastMonth, projectedThisMonth },
      })
    } else if (change < -15 && daysElapsed >= 10) {
      items.push({
        id: nextId(),
        kind: "velocity",
        title: "Spending is trending down",
        description: `At this pace, you'll save ₹${Math.round(lastMonth - projectedThisMonth).toLocaleString("en-IN")} vs last month. Keep it up.`,
        metric: `${change.toFixed(0)}% pace`,
        severity: "info",
        actionable: "Channel the surplus into your SIP or emergency fund.",
      })
    }
  }

  // ── Subscription: recurring small charges ──────────────────────────
  const last6Months = monthsAgo(6)
  const recurring = await prisma.expense.findMany({
    where: {
      profileId,
      deletedAt: null,
      date: { gte: last6Months },
      OR: [{ recurrenceType: "recurring" }, { tags: { contains: "subscription", mode: "insensitive" } }],
    },
    orderBy: { amount: "asc" },
    select: { id: true, amount: true, vendor: true, description: true, recurrenceType: true },
  })

  const byVendor = new Map<string, { count: number; total: number; sample: any }>()
  for (const e of recurring) {
    const key = (e.vendor || e.description || "unknown").toLowerCase().trim()
    if (!byVendor.has(key)) {
      byVendor.set(key, { count: 0, total: 0, sample: e })
    }
    const v = byVendor.get(key)!
    v.count++
    v.total += e.amount
  }

  const subscriptionLike = Array.from(byVendor.entries())
    .filter(([_, v]) => v.count >= 3 && v.sample.amount < 2000)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5)

  if (subscriptionLike.length > 0) {
    const totalSubscriptionCost = subscriptionLike.reduce((s, [_, v]) => s + v.total, 0)
    const monthlyAvg = Math.round(totalSubscriptionCost / 6)
    items.push({
      id: nextId(),
      kind: "subscription",
      title: `${subscriptionLike.length} small recurring charge${subscriptionLike.length === 1 ? "" : "s"} detected`,
      description: `Average ₹${monthlyAvg.toLocaleString("en-IN")}/month across ${subscriptionLike.length} merchant${subscriptionLike.length === 1 ? "" : "s"}. Top: ${subscriptionLike[0][0]} (₹${Math.round(subscriptionLike[0][1].total).toLocaleString("en-IN")} in 6 months).`,
      metric: `₹${monthlyAvg}/mo avg`,
      severity: monthlyAvg > 3000 ? "warn" : "info",
      actionable: "Review subscriptions — cancel anything unused.",
      data: { vendors: subscriptionLike.map(([k, v]) => ({ name: k, total: v.total, count: v.count })) },
    })
  }

  // ── Lifestyle creep: comparison 6mo ago vs last month ──────────────
  const sixMonthsAgo = monthsAgo(6)
  const fiveMonthsAgo = monthsAgo(5)
  const oldExpenses = await prisma.expense.aggregate({
    where: {
      profileId,
      deletedAt: null,
      date: { gte: sixMonthsAgo, lt: fiveMonthsAgo },
      category: { name: { in: ["dining-groceries", "shopping-general", "leisure", "apparel", "festive-occasions"] } },
    },
    _sum: { amount: true },
  })

  if (oldExpenses._sum.amount && oldExpenses._sum.amount > 0) {
    const lastMonthDiscretionary = await prisma.expense.aggregate({
      where: {
        profileId,
        deletedAt: null,
        date: { gte: lastMonthStart, lt: lastMonthEnd },
        category: { name: { in: ["dining-groceries", "shopping-general", "leisure", "apparel", "festive-occasions"] } },
      },
      _sum: { amount: true },
    })
    const oldAmt = oldExpenses._sum.amount
    const newAmt = lastMonthDiscretionary._sum.amount || 0
    const change = ((newAmt - oldAmt) / oldAmt) * 100
    if (change > 25) {
      items.push({
        id: nextId(),
        kind: "lifestyle-creep",
        title: "Discretionary spend has grown",
        description: `Dining, shopping, leisure, apparel, festive is up ${change.toFixed(0)}% (₹${Math.round(newAmt).toLocaleString("en-IN")} last month vs ₹${Math.round(oldAmt).toLocaleString("en-IN")} 6 months ago).`,
        metric: `+${change.toFixed(0)}%`,
        severity: change > 50 ? "alert" : "warn",
        actionable: "Apply the 50/50 raise rule on any income increases.",
      })
    }
  }

  // ── Tax optimization: 80C/80D/80CCD gap ───────────────────────────
  const investments = await prisma.investment.findMany({
    where: { profileId },
    select: { type: true, amount: true },
  })
  const totalELSS = investments.filter((i) => i.type?.toLowerCase().includes("elss")).reduce((s, i) => s + i.amount, 0)
  const totalNPS = investments.filter((i) => i.type?.toLowerCase().includes("nps")).reduce((s, i) => s + i.amount, 0)
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { annualIncome: true },
  })
  const annualIncome = profile?.annualIncome || 0
  if (annualIncome >= 700000) {
    const sec80CGap = Math.max(0, 150000 - totalELSS)
    const sec80CCD1BGap = Math.max(0, 50000 - totalNPS)
    const totalGap = sec80CGap + sec80CCD1BGap
    if (totalGap > 0) {
      const oldRegimeSaving = totalGap * 0.30
      items.push({
        id: nextId(),
        kind: "tax-optimization",
        title: "₹" + totalGap.toLocaleString("en-IN") + " tax-advantaged room unused",
        description: `80C: ₹${sec80CGap.toLocaleString("en-IN")} unfilled (ELSS gap).${sec80CCD1BGap > 0 ? ` 80CCD(1B): ₹${sec80CCD1BGap.toLocaleString("en-IN")} unfilled (NPS gap).` : ""} Old regime tax saving potential: ₹${Math.round(oldRegimeSaving).toLocaleString("en-IN")}.`,
        metric: `₹${totalGap.toLocaleString("en-IN")} gap`,
        severity: oldRegimeSaving > 30000 ? "warn" : "info",
        actionable: "Top up ELSS before 31 March. Add NPS Tier 1 for the extra ₹50K.",
      })
    }
  }

  // ── Weekend effect: weekend vs weekday spend ratio ─────────────────
  const last30 = new Date()
  last30.setDate(last30.getDate() - 30)
  const last30Expenses = await prisma.expense.findMany({
    where: { profileId, deletedAt: null, date: { gte: last30 } },
    select: { amount: true, date: true },
  })
  if (last30Expenses.length > 10) {
    let weekend = 0
    let weekday = 0
    let weekendCount = 0
    let weekdayCount = 0
    for (const e of last30Expenses) {
      const day = e.date.getDay()
      if (day === 0 || day === 6) {
        weekend += e.amount
        weekendCount++
      } else {
        weekday += e.amount
        weekdayCount++
      }
    }
    const weekendAvg = weekendCount > 0 ? weekend / weekendCount : 0
    const weekdayAvg = weekdayCount > 0 ? weekday / weekdayCount : 0
    if (weekdayAvg > 0 && weekendAvg > weekdayAvg * 1.8) {
      items.push({
        id: nextId(),
        kind: "weekend-effect",
        title: "Weekend spending is high",
        description: `Average per-transaction: ₹${Math.round(weekendAvg).toLocaleString("en-IN")} on weekends vs ₹${Math.round(weekdayAvg).toLocaleString("en-IN")} on weekdays. That's ${((weekendAvg / weekdayAvg) * 100 - 100).toFixed(0)}% higher.`,
        metric: `${(weekendAvg / weekdayAvg).toFixed(1)}× ratio`,
        severity: weekendAvg > weekdayAvg * 2.5 ? "warn" : "info",
        actionable: "Set a weekend spending cap.",
      })
    }
  }

  return items
}
