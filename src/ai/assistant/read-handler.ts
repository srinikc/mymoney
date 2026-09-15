// ── Read Handler ────────────────────────────────────────────────────────
// Queries the DB directly for read intents and formats natural responses.
// No LLM needed — deterministic, fast, ₹0 cost.

import { prisma } from "@/lib/prisma"
import type { AssistantIntent, ParsedEntities } from "@/shared/assistant"

export async function getReadResponse(
  intent: AssistantIntent,
  userId: number,
  profileId: number,
  _language = "en-IN",
  entities?: ParsedEntities
): Promise<string> {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const startOfMonth = new Date(year, month - 1, 1)

  switch (intent) {
    // ── Net Worth ───────────────────────────────────────────────────
    case "query_net_worth": {
      const [assets, liabilities, investments, bankAccounts] = await Promise.all([
        prisma.asset.findMany({ where: { profileId } }),
        prisma.liability.findMany({ where: { profileId } }),
        prisma.investment.findMany({ where: { profileId, status: "active" } }),
        prisma.bankAccount.findMany({ where: { profileId } }),
      ])

      const totalAssets = assets.reduce((s, a) => s + a.currentValue, 0)
      const totalInvestments = investments.reduce((s, i) => s + i.currentValue, 0)
      const totalBank = bankAccounts.reduce((s, b) => s + b.balance, 0)
      const totalLiabilities = liabilities.reduce((s, l) => s + l.amount, 0)
      const netWorth = totalAssets + totalInvestments + totalBank - totalLiabilities

      const lines: string[] = []
      lines.push(`Your net worth is ₹${fmt(netWorth)}.`)
      if (totalAssets > 0) lines.push(`• Physical assets: ₹${fmt(totalAssets)}`)
      if (totalInvestments > 0) lines.push(`• Investments: ₹${fmt(totalInvestments)}`)
      if (totalBank > 0) lines.push(`• Bank balance: ₹${fmt(totalBank)}`)
      if (totalLiabilities > 0) lines.push(`• Liabilities: ₹${fmt(totalLiabilities)}`)
      return lines.join("\n")
    }

    // ── Spending ────────────────────────────────────────────────────
    case "query_spending": {
      const tMonth = entities?.month || month
      const tYear = entities?.year || year
      const tStart = new Date(tYear, tMonth - 1, 1)
      const pStart = new Date(tYear, tMonth - 2, 1)
      const pEnd = new Date(tYear, tMonth - 1, 1)
      const [monthlyAgg, prevMonthAgg, topCats, recent] = await Promise.all([
        prisma.expense.aggregate({
          where: { profileId, date: { gte: tStart }, amount: { gt: 0 } },
          _sum: { amount: true },
          _count: true,
        }),
        prisma.expense.aggregate({
          where: { profileId, date: { gte: pStart, lt: pEnd }, amount: { gt: 0 } },
          _sum: { amount: true },
        }),
        prisma.expense.groupBy({
          by: ["categoryId"],
          where: { profileId, date: { gte: tStart }, amount: { gt: 0 } },
          _sum: { amount: true },
          orderBy: { _sum: { amount: "desc" } },
          take: 5,
        }),
        prisma.expense.findMany({
          where: { profileId, date: { gte: tStart }, amount: { gt: 0 } },
          include: { category: true },
          orderBy: { date: "desc" },
          take: 5,
        }),
      ])

      const monthly = monthlyAgg._sum?.amount || 0
      const count = monthlyAgg._count || 0
      const prevMonth = prevMonthAgg._sum?.amount || 0
      const diff = prevMonth > 0 ? ((monthly - prevMonth) / prevMonth * 100) : 0

      const catNames = await prisma.category.findMany({ where: { type: "expense" } })
      const catMap = new Map(catNames.map(c => [c.id, c.name]))

      const lines: string[] = []
      const periodLabel = entities?.month ? `in ${monthNames[tMonth - 1]} ${tYear}` : "this month"
      lines.push(`You spent ₹${fmt(monthly)} ${periodLabel} across ${count} transactions.`)
      if (prevMonth > 0) {
        const arrow = diff > 0 ? "📈 up" : "📉 down"
        lines.push(`${arrow} ${Math.abs(diff).toFixed(0)}% from last month (₹${fmt(prevMonth)}).`)
      }
      if (topCats.length > 0) {
        lines.push("", "Top categories:")
        for (const c of topCats) {
          const name = catMap.get(c.categoryId) || "Other"
          lines.push(`• ${name}: ₹${fmt(c._sum?.amount || 0)}`)
        }
      }
      if (recent.length > 0) {
        lines.push("", "Recent transactions:")
        for (const e of recent) {
          lines.push(`• ${fmtDate(e.date)} — ${e.description || e.category.name} — ₹${fmt(e.amount)}`)
        }
      }
      return lines.join("\n")
    }

    // ── Transactions ────────────────────────────────────────────────
    case "query_transactions": {
      const pMonth = entities?.month
      const pYear = entities?.year || year
      const where: { profileId: number; amount: { gt: number }; date?: { gte: Date; lt: Date } } = {
        profileId,
        amount: { gt: 0 },
      }
      let label = "Your recent transactions:"
      let take = 10
      if (pMonth) {
        where.date = { gte: new Date(pYear, pMonth - 1, 1), lt: new Date(pYear, pMonth, 1) }
        label = `Your transactions for ${monthNames[pMonth - 1]} ${pYear}:`
        take = 100
      }
      const txns = await prisma.expense.findMany({
        where,
        include: { category: true },
        orderBy: { date: "desc" },
        take,
      })
      if (txns.length === 0) {
        return pMonth
          ? `You don't have any transactions recorded for ${monthNames[pMonth - 1]} ${pYear}.`
          : "You don't have any transactions recorded yet."
      }
      const lines = [label, ""]
      for (const e of txns) {
        lines.push(`• ${fmtDate(e.date)} — ${e.description || e.category.name} — ₹${fmt(e.amount)}`)
      }
      if (pMonth) {
        const total = txns.reduce((s, e) => s + e.amount, 0)
        lines.push("", `Total: ₹${fmt(total)} across ${txns.length} transactions.`)
      }
      return lines.join("\n")
    }

    // ── Budget ──────────────────────────────────────────────────────
    case "query_budget": {
      const [budgets, expByCat] = await Promise.all([
        prisma.budget.findMany({ where: { profileId, month, year }, include: { category: true } }),
        prisma.expense.groupBy({
          by: ["categoryId"],
          where: { profileId, date: { gte: startOfMonth }, amount: { gt: 0 } },
          _sum: { amount: true },
        }),
      ])
      if (budgets.length === 0) return "You don't have any budgets set for this month. Would you like to create one?"
      const expenseMap = new Map(expByCat.map(e => [e.categoryId, e._sum?.amount || 0]))
      const lines = [`Budget status for ${monthNames[month - 1]}:`, ""]
      let overCount = 0
      for (const b of budgets) {
        const spent = expenseMap.get(b.categoryId) || 0
        const pct = b.amount > 0 ? (spent / b.amount * 100) : 0
        const emoji = pct >= 100 ? "🔴" : pct >= 80 ? "🟡" : "🟢"
        lines.push(`${emoji} ${b.category.name}: ₹${fmt(spent)} / ₹${fmt(b.amount)} (${pct.toFixed(0)}%)`)
        const remaining = b.amount - spent
        if (remaining < 0) {
          lines.push(`   ⚠️ Over budget by ₹${fmt(Math.abs(remaining))}`)
          overCount++
        } else {
          lines.push(`   ₹${fmt(remaining)} remaining`)
        }
      }
      lines.push("", overCount > 0 ? `⚠️ Over budget in ${overCount} categories.` : "✅ All budgets on track!")
      return lines.join("\n")
    }

    // ── Goals ───────────────────────────────────────────────────────
    case "query_goals": {
      const goals = await prisma.goal.findMany({ where: { profileId, status: "active" } })
      if (goals.length === 0) return "You don't have any active goals yet. Would you like to set one?"
      const lines = ["Your savings goals:", ""]
      for (const g of goals) {
        const pct = g.targetAmount > 0 ? (g.currentAmount / g.targetAmount * 100) : 0
        const emoji = pct >= 100 ? "✅" : pct >= 75 ? "🟢" : pct >= 50 ? "🟡" : "🔴"
        lines.push(`${emoji} ${g.name}: ₹${fmt(g.currentAmount)} / ₹${fmt(g.targetAmount)} (${pct.toFixed(0)}%)`)
        const remaining = g.targetAmount - g.currentAmount
        lines.push(remaining > 0 ? `   ₹${fmt(remaining)} to go` : "   🎉 Goal achieved!")
      }
      return lines.join("\n")
    }

    // ── Investments ─────────────────────────────────────────────────
    case "query_investments": {
      const invs = await prisma.investment.findMany({ where: { profileId, status: "active" } })
      if (invs.length === 0) return "You don't have any active investments tracked. Would you like to add one?"
      const totalInvested = invs.reduce((s, i) => s + i.amount, 0)
      const totalCurrent = invs.reduce((s, i) => s + i.currentValue, 0)
      const totalReturn = totalInvested > 0 ? ((totalCurrent - totalInvested) / totalInvested * 100) : 0
      const lines = ["Your investment portfolio:", ""]
      for (const i of invs) {
        const ret = i.amount > 0 ? ((i.currentValue - i.amount) / i.amount * 100) : 0
        const arrow = ret >= 0 ? "📈" : "📉"
        lines.push(`• ${i.name}: ₹${fmt(i.currentValue)} (invested: ₹${fmt(i.amount)}) ${arrow} ${ret >= 0 ? "+" : ""}${ret.toFixed(1)}%`)
      }
      lines.push(
        "",
        `Total invested: ₹${fmt(totalInvested)}`,
        `Current value: ₹${fmt(totalCurrent)}`,
        `Overall return: ${totalReturn >= 0 ? "+" : ""}${totalReturn.toFixed(1)}%`,
      )
      return lines.join("\n")
    }

    // ── Income ──────────────────────────────────────────────────────
    case "query_income": {
      const [monthInc, totalInc] = await Promise.all([
        prisma.expense.aggregate({
          where: { profileId, date: { gte: startOfMonth }, amount: { lt: 0 } },
          _sum: { amount: true },
        }),
        prisma.expense.aggregate({
          where: { profileId, amount: { lt: 0 } },
          _sum: { amount: true },
        }),
      ])
      const thisMonth = Math.abs(monthInc._sum?.amount || 0)
      const total = Math.abs(totalInc._sum?.amount || 0)
      return `Income this month: ₹${fmt(thisMonth)}\nTotal income recorded: ₹${fmt(total)}`
    }

    // ── Subscriptions ───────────────────────────────────────────────
    case "query_subscriptions": {
      const subs = await prisma.subscription.findMany({ where: { profileId, status: "active" } })
      if (subs.length === 0) return "You don't have any active subscriptions tracked."
      const monthlyCost = subs.reduce((s, sub) => {
        if (sub.billingCycle === "monthly") return s + sub.amount
        if (sub.billingCycle === "quarterly") return s + sub.amount / 3
        if (sub.billingCycle === "yearly") return s + sub.amount / 12
        return s + sub.amount
      }, 0)
      const lines = ["Your active subscriptions:", ""]
      for (const s of subs) lines.push(`• ${s.name}: ₹${fmt(s.amount)}/${s.billingCycle}`)
      lines.push(
        "",
        `Monthly cost: ₹${fmt(monthlyCost)}`,
        `Annual cost: ₹${fmt(monthlyCost * 12)}`,
      )
      return lines.join("\n")
    }

    // ── Health ──────────────────────────────────────────────────────
    case "query_health": {
      const [expAgg, incAgg, budgets, goals, invs] = await Promise.all([
        prisma.expense.aggregate({
          where: { profileId, date: { gte: startOfMonth }, amount: { gt: 0 } },
          _sum: { amount: true },
        }),
        prisma.expense.aggregate({
          where: { profileId, amount: { lt: 0 } },
          _sum: { amount: true },
        }),
        prisma.budget.findMany({ where: { profileId, month, year } }),
        prisma.goal.findMany({ where: { profileId, status: "active" } }),
        prisma.investment.findMany({ where: { profileId, status: "active" } }),
      ])
      const monthlyExp = expAgg._sum?.amount || 0
      const totalInc = Math.abs(incAgg._sum?.amount || 0)
      const monthlyInc = totalInc > 0 ? totalInc / 12 : 0
      const savRate = monthlyInc > 0 ? ((monthlyInc - monthlyExp) / monthlyInc * 100) : 0
      const pillars: string[] = []
      pillars.push(savRate >= 20 ? `✅ Savings rate: ${savRate.toFixed(0)}%` : savRate >= 10 ? `🟡 Savings rate: ${savRate.toFixed(0)}%` : `🔴 Savings rate: ${savRate.toFixed(0)}%`, budgets.length > 0 ? `✅ ${budgets.length} budgets set` : "🔴 No budgets set", goals.length > 0 ? `✅ ${goals.length} active goals` : "🟡 No goals set", invs.length > 0 ? `✅ ${invs.length} investments` : "🟡 No investments tracked")
      return [`Financial Health Check:`, "", ...pillars, "", `Monthly spending: ₹${fmt(monthlyExp)}`, `Savings rate: ${savRate.toFixed(0)}%`].join("\n")
    }

    default:
      return ""
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 0 })
}

function fmtDate(d: Date): string {
  return d.toISOString().split("T")[0]
}

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]
