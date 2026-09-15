// ── Deterministic Read Domains ──────────────────────────────────────────
// Answers questions about ANY MyMoney data straight from the database — no
// LLM required. Each domain has keywords (for intent detection) and a handler
// that queries Prisma and formats a concise natural-language answer.
//
// Also provides page navigation targets so "open budgets" / "go to loans"
// resolve to a deep link.

import { prisma } from "@/lib/prisma"
import type { ParsedEntities } from "@/shared/assistant"

export interface DomainContext {
  userId: number
  profileId: number
  entities: ParsedEntities
}

export interface ReadDomain {
  key: string
  label: string
  keywords: RegExp
  adminOnly?: boolean
  handler: (ctx: DomainContext) => Promise<string>
}

// ── Helpers ─────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 0 })
}

function fmtDate(d: Date | null | undefined): string {
  return d ? d.toISOString().split("T")[0] : "—"
}

function monthName(m: number): string {
  return ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][m - 1] || ""
}

async function isAdmin(userId: number): Promise<boolean> {
  try {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
    return u?.role === "admin"
  } catch {
    return false
  }
}

const ADMIN_DENY = "That's an admin-only area — you don't have access to it."

// ── Read Domains ────────────────────────────────────────────────────────

export const READ_DOMAINS: ReadDomain[] = [
  {
    key: "assets",
    label: "Assets",
    keywords: /\b(assets?|property|properties|real estate|jewell?ery|gold|silver|vehicles?)\b/i,
    handler: async ({ profileId }) => {
      const assets = await prisma.asset.findMany({ where: { profileId }, orderBy: { currentValue: "desc" } })
      if (assets.length === 0) return "You haven't added any assets yet. Add them under **Assets**."
      const total = assets.reduce((s, a) => s + a.currentValue, 0)
      const lines = [`Your assets (total ₹${fmt(total)}):`, ""]
      for (const a of assets.slice(0, 12)) lines.push(`• ${a.name} (${a.type}) — ₹${fmt(a.currentValue)}`)
      if (assets.length > 12) lines.push(`…and ${assets.length - 12} more.`)
      return lines.join("\n")
    },
  },
  {
    key: "liabilities",
    label: "Liabilities",
    keywords: /\b(liabilit(y|ies)|debts?|amount i owe|what i owe)\b/i,
    handler: async ({ profileId }) => {
      const items = await prisma.liability.findMany({ where: { profileId }, orderBy: { amount: "desc" } })
      if (items.length === 0) return "You have no liabilities recorded. 🎉"
      const total = items.reduce((s, l) => s + l.amount, 0)
      const lines = [`Your liabilities (total ₹${fmt(total)}):`, ""]
      for (const l of items.slice(0, 12)) lines.push(`• ${l.name} (${l.type}) — ₹${fmt(l.amount)}${l.interestRate ? ` @ ${l.interestRate}%` : ""}`)
      return lines.join("\n")
    },
  },
  {
    key: "bank_accounts",
    label: "Bank accounts",
    keywords: /\b(bank accounts?|bank balance|account balance|savings account|current account)\b/i,
    handler: async ({ profileId }) => {
      const [accounts, cash] = await Promise.all([
        prisma.bankAccount.findMany({ where: { profileId, isActive: true }, orderBy: { balance: "desc" } }),
        prisma.cashBalance.findMany({ where: { profileId } }),
      ])
      if (accounts.length === 0 && cash.length === 0) return "You haven't added any bank accounts yet."
      const total = accounts.reduce((s, a) => s + a.balance, 0)
      const cashTotal = cash.reduce((s, c) => s + c.amount, 0)
      const lines = [`Your bank balances (total ₹${fmt(total + cashTotal)}):`, ""]
      for (const a of accounts) lines.push(`• ${a.name} — ${a.bankName} — ₹${fmt(a.balance)}${a.isEmergencyFund ? " 🛟 (emergency fund)" : ""}`)
      if (cashTotal > 0) lines.push(`• Cash in hand — ₹${fmt(cashTotal)}`)
      return lines.join("\n")
    },
  },
  {
    key: "fixed_deposits",
    label: "Fixed deposits",
    keywords: /\b(fd|fds|fixed deposits?|term deposits?)\b/i,
    handler: async ({ profileId }) => {
      const fds = await prisma.fixedDeposit.findMany({ where: { profileId }, include: { bankAccount: true }, orderBy: { principal: "desc" } })
      if (fds.length === 0) return "You don't have any fixed deposits recorded."
      const total = fds.reduce((s, f) => s + f.principal, 0)
      const lines = [`Your fixed deposits (principal ₹${fmt(total)}):`, ""]
      for (const f of fds.slice(0, 12)) lines.push(`• ${f.bankAccount?.bankName || "FD"} — ₹${fmt(f.principal)} @ ${f.interestRate}% — matures ${fmtDate(f.maturityDate)}`)
      return lines.join("\n")
    },
  },
  {
    key: "cash",
    label: "Cash",
    keywords: /\b(cash balance|cash in hand|wallet|cash on hand)\b/i,
    handler: async ({ profileId }) => {
      const cash = await prisma.cashBalance.findMany({ where: { profileId } })
      if (cash.length === 0) return "You haven't recorded any cash balances."
      const total = cash.reduce((s, c) => s + c.amount, 0)
      return `Cash in hand: ₹${fmt(total)}`
    },
  },
  {
    key: "loans",
    label: "Loans",
    keywords: /\b(loans?|emi|emis|mortgage|borrowed|outstanding loan)\b/i,
    handler: async ({ profileId }) => {
      const loans = await prisma.loan.findMany({ where: { profileId }, orderBy: { principal: "desc" } })
      if (loans.length === 0) return "You don't have any loans recorded."
      const totalEmi = loans.reduce((s, l) => s + l.emiAmount, 0)
      const totalOutstanding = loans.reduce((s, l) => s + (l.remainingAmount ?? l.principal), 0)
      const lines = [`Your loans (${loans.length}) — monthly EMI ₹${fmt(totalEmi)}, outstanding ₹${fmt(totalOutstanding)}:`, ""]
      for (const l of loans.slice(0, 12)) lines.push(`• ${l.name} (${l.type}) — principal ₹${fmt(l.principal)}, EMI ₹${fmt(l.emiAmount)} @ ${l.interestRate}%`)
      return lines.join("\n")
    },
  },
  {
    key: "insurance",
    label: "Insurance",
    keywords: /\b(insurance|polic(y|ies)|premium|sum assured|cover)\b/i,
    handler: async ({ profileId }) => {
      const policies = await prisma.insurance.findMany({ where: { profileId }, orderBy: { premium: "desc" } })
      if (policies.length === 0) return "You don't have any insurance policies recorded."
      const totalPremium = policies.reduce((s, p) => s + p.premium, 0)
      const lines = [`Your insurance policies (${policies.length}) — total premium ₹${fmt(totalPremium)}:`, ""]
      for (const p of policies.slice(0, 12)) {
        lines.push(`• ${p.name} (${p.insuranceType || p.type}) — ₹${fmt(p.premium)}/${p.premiumFrequency}${p.sumAssured ? `, cover ₹${fmt(p.sumAssured)}` : ""}`)
      }
      return lines.join("\n")
    },
  },
  {
    key: "income_sources",
    label: "Income sources",
    keywords: /\b(income sources?|salary sources?|where.*income.*from|sources of income)\b/i,
    handler: async ({ profileId }) => {
      const sources = await prisma.incomeSource.findMany({ where: { profileId }, orderBy: { amount: "desc" } })
      if (sources.length === 0) return "You haven't added any income sources yet."
      const lines = [`Your income sources (${sources.length}):`, ""]
      for (const s of sources.slice(0, 12)) lines.push(`• ${s.name} — ₹${fmt(s.amount)} (${s.type})`)
      return lines.join("\n")
    },
  },
  {
    key: "reminders",
    label: "Reminders",
    keywords: /\b(reminders?|upcoming bills?|due payments?|due bills?|todo|to-?do)\b/i,
    handler: async ({ profileId }) => {
      const items = await prisma.reminder.findMany({ where: { profileId, isCompleted: false }, orderBy: { dueDate: "asc" }, take: 20 })
      if (items.length === 0) return "You have no pending reminders. ✅"
      const lines = [`Your pending reminders (${items.length}):`, ""]
      for (const r of items) lines.push(`• ${r.title}${r.dueDate ? ` — due ${fmtDate(r.dueDate)}` : ""}${r.amount ? ` — ₹${fmt(r.amount)}` : ""}`)
      return lines.join("\n")
    },
  },
  {
    key: "deals",
    label: "Deals",
    keywords: /\b(deals?|offers?|coupons?|discounts?)\b/i,
    handler: async ({ profileId }) => {
      const deals = await prisma.deal.findMany({ where: { isActive: true, OR: [{ profileId }, { profileId: null }] }, take: 15 })
      if (deals.length === 0) return "There are no active deals right now."
      const lines = ["Active deals:", ""]
      for (const d of deals) lines.push(`• ${d.merchant}: ${d.title}${d.couponCode ? ` (code ${d.couponCode})` : ""}`)
      return lines.join("\n")
    },
  },
  {
    key: "obligations",
    label: "Obligations",
    keywords: /\b(obligations?|monthly commitments?|commitments?)\b/i,
    handler: async ({ profileId }) => {
      const items = await prisma.obligation.findMany({ where: { profileId, isActive: true }, orderBy: { monthlyAmount: "desc" } })
      if (items.length === 0) return "You have no active financial obligations recorded."
      const monthly = items.reduce((s, o) => s + o.monthlyAmount, 0)
      const lines = [`Your obligations (₹${fmt(monthly)}/month):`, ""]
      for (const o of items.slice(0, 12)) lines.push(`• ${o.description} (${o.type}) — ₹${fmt(o.monthlyAmount)}/month`)
      return lines.join("\n")
    },
  },
  {
    key: "family",
    label: "Family",
    keywords: /\b(family members?|dependents?|spouse|children|parents)\b/i,
    handler: async ({ profileId }) => {
      const members = await prisma.familyMember.findMany({ where: { profileId } })
      if (members.length === 0) return "You haven't added any family members yet (Settings → Family)."
      const lines = [`Your family members (${members.length}):`, ""]
      for (const m of members) lines.push(`• ${m.name} (${m.relation})${m.isDependent ? " — dependent" : ""}`)
      return lines.join("\n")
    },
  },
  {
    key: "emergency_fund",
    label: "Emergency fund",
    keywords: /\b(emergency fund|rainy day fund)\b/i,
    handler: async ({ profileId }) => {
      const now = new Date()
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)
      const [emergencyAccounts, cash, agg] = await Promise.all([
        prisma.bankAccount.findMany({ where: { profileId, isEmergencyFund: true } }),
        prisma.cashBalance.findMany({ where: { profileId } }),
        prisma.expense.aggregate({ where: { profileId, amount: { gt: 0 }, date: { gte: threeMonthsAgo } }, _sum: { amount: true } }),
      ])
      const balance = emergencyAccounts.reduce((s, a) => s + a.balance, 0) + cash.reduce((s, c) => s + c.amount, 0)
      const avgMonthly = (agg._sum?.amount || 0) / 3
      const target = avgMonthly * 6
      const months = avgMonthly > 0 ? balance / avgMonthly : 0
      const lines = [`Emergency fund: ₹${fmt(balance)}`]
      if (avgMonthly > 0) {
        lines.push(
          `Average monthly expenses: ₹${fmt(avgMonthly)}`,
          `Covers ≈ ${months.toFixed(1)} months (target: 6 months = ₹${fmt(target)})`,
          balance >= target ? "✅ You're fully funded!" : `You still need ₹${fmt(Math.max(0, target - balance))}.`,
        )
      } else {
        lines.push("Add some expenses to estimate how many months this covers.")
      }
      return lines.join("\n")
    },
  },
  {
    key: "tax",
    label: "Tax",
    keywords: /\b(tax|taxes|itr|form ?16|26as|tds|tax refund)\b/i,
    handler: async ({ profileId }) => {
      const [docs, itrs] = await Promise.all([
        prisma.taxDocument.findMany({ where: { profileId }, orderBy: { createdAt: "desc" }, take: 10 }),
        prisma.iTRRecord.findMany({ where: { profileId }, orderBy: { ay: "desc" }, take: 10 }),
      ])
      if (docs.length === 0 && itrs.length === 0) return "You haven't added any tax documents or ITR records yet (Tax page)."
      const lines = ["Your tax records:", ""]
      for (const d of docs) lines.push(`• ${d.type.toUpperCase()} — FY ${d.fy}${d.label ? ` (${d.label})` : ""}`)
      for (const i of itrs) lines.push(`• ITR ${i.itrForm} — AY ${i.ay} — ${i.status}${i.refundAmount ? ` — refund ₹${fmt(i.refundAmount)}` : ""}`)
      return lines.join("\n")
    },
  },
  {
    key: "payments",
    label: "Payments",
    keywords: /\b(payments?|invoices?|receipts?|billing history)\b/i,
    handler: async ({ userId }) => {
      const payments = await prisma.payment.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 12 })
      if (payments.length === 0) return "You have no payment records."
      const lines = [`Your payments (${payments.length}):`, ""]
      for (const p of payments) lines.push(`• ${p.plan} — ₹${fmt(p.amount / 100)} — ${p.status} — ${fmtDate(p.createdAt)}`)
      return lines.join("\n")
    },
  },
  {
    key: "categories",
    label: "Categories",
    keywords: /\b(categories|category list|what categories)\b/i,
    handler: async () => {
      const cats = await prisma.category.findMany({ where: { type: "expense" }, orderBy: { name: "asc" } })
      if (cats.length === 0) return "No categories found."
      return `Your expense categories (${cats.length}): ${cats.map((c) => c.name).join(", ")}`
    },
  },
  {
    key: "insights",
    label: "Insights",
    keywords: /\b(insights?|analysis|anomal|spending patterns?|trends?)\b/i,
    handler: async ({ profileId }) => {
      const now = new Date()
      const y = now.getFullYear()
      const m = now.getMonth() + 1
      const start = new Date(y, m - 1, 1)
      const prevStart = new Date(y, m - 2, 1)
      const [thisAgg, prevAgg, top, unusual] = await Promise.all([
        prisma.expense.aggregate({ where: { profileId, date: { gte: start }, amount: { gt: 0 } }, _sum: { amount: true } }),
        prisma.expense.aggregate({ where: { profileId, date: { gte: prevStart, lt: start }, amount: { gt: 0 } }, _sum: { amount: true } }),
        prisma.expense.groupBy({ by: ["categoryId"], where: { profileId, date: { gte: start }, amount: { gt: 0 } }, _sum: { amount: true }, orderBy: { _sum: { amount: "desc" } }, take: 3 }),
        prisma.expense.count({ where: { profileId, isUnusual: true, date: { gte: start } } }),
      ])
      const cats = await prisma.category.findMany({ where: { type: "expense" } })
      const map = new Map(cats.map((c) => [c.id, c.name]))
      const thisMonth = thisAgg._sum?.amount || 0
      const prev = prevAgg._sum?.amount || 0
      const change = prev > 0 ? ((thisMonth - prev) / prev) * 100 : 0
      const lines = [`Insights for ${monthName(m)}:`, "", `• Spending: ₹${fmt(thisMonth)}${prev > 0 ? ` (${change >= 0 ? "up" : "down"} ${Math.abs(change).toFixed(0)}% vs last month)` : ""}`]
      if (top.length > 0) lines.push(`• Top category: ${map.get(top[0].categoryId) || "Other"} — ₹${fmt(top[0]._sum?.amount || 0)}`)
      if (unusual > 0) lines.push(`• ${unusual} unusual transaction(s) flagged`)
      return lines.join("\n")
    },
  },
  {
    key: "reports",
    label: "Reports",
    keywords: /\b(reports?|monthly summary|yearly summary|income vs expense)\b/i,
    handler: async ({ profileId }) => {
      const now = new Date()
      const lines = ["Income vs expenses (last 6 months):", ""]
      for (let i = 5; i >= 0; i--) {
        const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
        const [exp, inc] = await Promise.all([
          prisma.expense.aggregate({ where: { profileId, date: { gte: start, lt: end }, amount: { gt: 0 } }, _sum: { amount: true } }),
          prisma.expense.aggregate({ where: { profileId, date: { gte: start, lt: end }, amount: { lt: 0 } }, _sum: { amount: true } }),
        ])
        const e = exp._sum?.amount || 0
        const incAbs = Math.abs(inc._sum?.amount || 0)
        lines.push(`• ${monthName(start.getMonth() + 1)} ${start.getFullYear()}: income ₹${fmt(incAbs)} · expenses ₹${fmt(e)} · saved ₹${fmt(incAbs - e)}`)
      }
      return lines.join("\n")
    },
  },
  {
    key: "alerts",
    label: "Alerts",
    keywords: /\b(alerts?|notification config|notification settings)\b/i,
    handler: async ({ profileId }) => {
      const [rules, configs] = await Promise.all([
        prisma.alertRule.findMany({ where: { profileId } }),
        prisma.notificationConfig.findMany({ where: { profileId } }),
      ])
      if (rules.length === 0 && configs.length === 0) return "You have no alert rules or notification channels configured."
      const lines = ["Your alerts:", ""]
      for (const r of rules) lines.push(`• ${r.name} — ${r.isEnabled ? "enabled" : "disabled"}`)
      for (const c of configs) lines.push(`• ${c.channel} notifications — ${c.enabled ? "on" : "off"}`)
      return lines.join("\n")
    },
  },
  {
    key: "shared_profiles",
    label: "Shared profiles",
    keywords: /\b(shared profiles?|family sharing|who has access|sharing)\b/i,
    handler: async ({ profileId }) => {
      const shares = await prisma.sharedProfile.findMany({ where: { profileId } })
      if (shares.length === 0) return "This profile isn't shared with anyone yet."
      const lines = ["People with access to this profile:", ""]
      for (const s of shares) lines.push(`• ${s.invitedEmail} — ${s.role} — ${s.status}`)
      return lines.join("\n")
    },
  },
  {
    key: "imports",
    label: "Imports",
    keywords: /\b(imports?|import sessions?|gmail scans?|imported (statements?|emails?)|gpay)\b/i,
    handler: async ({ userId }) => {
      const [sessions, scans] = await Promise.all([
        prisma.importSession.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 8 }),
        prisma.gmailScan.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }),
      ])
      if (sessions.length === 0 && scans.length === 0) return "No imports or Gmail scans recorded yet."
      const lines = ["Recent imports:", ""]
      for (const s of sessions) lines.push(`• ${s.source}${s.fileName ? ` (${s.fileName})` : ""} — ${s.status} — ${s.totalRows} rows`)
      for (const g of scans) lines.push(`• Gmail scan — ${g.status} — ${g.parsed}/${g.totalEmails} parsed`)
      return lines.join("\n")
    },
  },
  {
    key: "vendors",
    label: "Vendors",
    keywords: /\b(vendors?|merchants?|vendor mappings?)\b/i,
    handler: async ({ userId }) => {
      const mappings = await prisma.vendorMapping.findMany({ where: { userId }, take: 20 })
      if (mappings.length === 0) return "You have no saved vendor mappings yet."
      const lines = [`Your vendor mappings (${mappings.length}):`, ""]
      for (const m of mappings.slice(0, 15)) lines.push(`• ${m.vendorKey} → ${m.category || m.description || "—"}`)
      return lines.join("\n")
    },
  },
  {
    key: "unusual_expenses",
    label: "Unusual expenses",
    keywords: /\b(unusual expenses?|large expenses?|flagged expenses?)\b/i,
    handler: async ({ profileId }) => {
      const items = await prisma.expense.findMany({ where: { profileId, isUnusual: true, deletedAt: null }, include: { category: true }, orderBy: { date: "desc" }, take: 15 })
      if (items.length === 0) return "No unusual expenses flagged. ✅"
      const lines = ["Unusual expenses:", ""]
      for (const e of items) lines.push(`• ${fmtDate(e.date)} — ${e.description || e.category.name} — ₹${fmt(e.amount)}`)
      return lines.join("\n")
    },
  },
  {
    key: "archived_expenses",
    label: "Archived expenses",
    keywords: /\b(archived expenses?|deleted expenses?|expense archive)\b/i,
    handler: async ({ profileId }) => {
      const count = await prisma.expense.count({ where: { profileId, deletedAt: { not: null } } })
      if (count === 0) return "You have no archived expenses."
      return `You have ${count} archived expense(s). Open **Expenses → Archive** to review them.`
    },
  },
  {
    key: "goal_allocations",
    label: "Goal allocations",
    keywords: /\b(goal allocations?|allocated to goals?|goal tagging)\b/i,
    handler: async ({ profileId }) => {
      const goals = await prisma.goal.findMany({ where: { profileId }, include: { allocations: true } })
      if (goals.length === 0) return "You have no goals yet."
      const lines = ["Goal allocations:", ""]
      for (const g of goals.slice(0, 12)) {
        const value = g.allocations.reduce((s, a) => s + (a.allocationValue || 0), 0)
        lines.push(`• ${g.name} — ${g.allocations.length} linked item(s)${value > 0 ? ` — ₹${fmt(value)}` : ""}`)
      }
      return lines.join("\n")
    },
  },
  {
    key: "backups",
    label: "Backups",
    keywords: /\b(backups?|restore points?|backup history)\b/i,
    adminOnly: true,
    handler: async () => {
      const items = await prisma.backupHistory.findMany({ orderBy: { createdAt: "desc" }, take: 10 })
      if (items.length === 0) return "No backups recorded."
      const lines = ["Recent backups:", ""]
      for (const b of items) lines.push(`• ${b.type} — ${b.status} — ${fmtDate(b.createdAt)}${b.totalSize ? ` — ${(b.totalSize / 1024 / 1024).toFixed(1)} MB` : ""}`)
      return lines.join("\n")
    },
  },
  {
    key: "ads",
    label: "Ad revenue",
    keywords: /\b(ad revenue|ad impressions?|ad clicks?|ads performance)\b/i,
    adminOnly: true,
    handler: async () => {
      const [impressions, clicks] = await Promise.all([prisma.adImpression.count(), prisma.adClick.count()])
      return `Ads: ${fmt(impressions)} impressions, ${fmt(clicks)} clicks (CTR ${impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : "0"}%).`
    },
  },
  {
    key: "funds",
    label: "Fund universe",
    keywords: /\b(fund metadata|curated funds?|fund scores?|fund scoring)\b/i,
    adminOnly: true,
    handler: async () => {
      const [count, top] = await Promise.all([
        prisma.fundMetadata.count({ where: { isActive: true } }),
        prisma.fundMetadata.findMany({ where: { isActive: true }, orderBy: { aiScore: "desc" }, take: 5 }),
      ])
      if (count === 0) return "No fund metadata loaded."
      const lines = [`${count} curated funds. Top by AI score:`, ""]
      for (const f of top) lines.push(`• ${f.schemeName} — score ${f.aiScore}`)
      return lines.join("\n")
    },
  },
  {
    key: "loan_products",
    label: "Loan products",
    keywords: /\b(loan products?|loan offers?|best loans?)\b/i,
    adminOnly: true,
    handler: async () => {
      const products = await prisma.loanProduct.findMany({ where: { isActive: true }, orderBy: { displayOrder: "asc" }, take: 10 })
      if (products.length === 0) return "No loan products configured."
      const lines = ["Loan products:", ""]
      for (const p of products) lines.push(`• ${p.bankName} ${p.productName} (${p.loanType}) — ${p.interestRateMin}–${p.interestRateMax}%`)
      return lines.join("\n")
    },
  },
]

// ── Domain resolution ───────────────────────────────────────────────────

/** Return the first domain whose keywords match the text. */
export function resolveDomain(text: string): ReadDomain | null {
  for (const domain of READ_DOMAINS) {
    if (domain.keywords.test(text)) return domain
  }
  return null
}

/** Run the domain handler, with an admin guard where required. */
export async function getDomainResponse(domain: ReadDomain, ctx: DomainContext): Promise<string> {
  if (domain.adminOnly && !(await isAdmin(ctx.userId))) return ADMIN_DENY
  try {
    return await domain.handler(ctx)
  } catch {
    return `I couldn't load your ${domain.label.toLowerCase()} right now. Please try again.`
  }
}

// ── Navigation targets ──────────────────────────────────────────────────

export interface NavTarget {
  keywords: RegExp
  path: string
  label: string
}

export const NAV_TARGETS: NavTarget[] = [
  { keywords: /\b(bank accounts?|fixed deposits?|fds?)\b/i, path: "/bank-accounts", label: "Bank Accounts" },
  { keywords: /\b(budgets?)\b/i, path: "/budgets", label: "Budgets" },
  { keywords: /\b(expenses?|spending|transactions?)\b/i, path: "/expenses", label: "Expenses" },
  { keywords: /\b(income|salaries|salary)\b/i, path: "/income", label: "Income" },
  { keywords: /\b(goals?|savings goal)\b/i, path: "/goals", label: "Goals" },
  { keywords: /\b(investments?|portfolio|sips?|mutual funds?|stocks?)\b/i, path: "/investments", label: "Investments" },
  { keywords: /\b(net worth|wealth)\b/i, path: "/net-worth", label: "Net Worth" },
  { keywords: /\b(assets?|property|properties)\b/i, path: "/assets", label: "Assets" },
  { keywords: /\b(liabilit(y|ies)|debts?)\b/i, path: "/net-worth", label: "Net Worth" },
  { keywords: /\b(loans?|emis?|mortgage)\b/i, path: "/loans", label: "Loans" },
  { keywords: /\b(insurance|polic(y|ies))\b/i, path: "/insurance", label: "Insurance" },
  { keywords: /\b(subscriptions?)\b/i, path: "/subscriptions", label: "Subscriptions" },
  { keywords: /\b(reminders?)\b/i, path: "/reminders", label: "Reminders" },
  { keywords: /\b(deals?|offers?|coupons?)\b/i, path: "/deals", label: "Deals" },
  { keywords: /\b(family|dependents?)\b/i, path: "/family", label: "Family Sharing" },
  { keywords: /\b(emergency fund)\b/i, path: "/emergency-fund", label: "Emergency Fund" },
  { keywords: /\b(health|health score)\b/i, path: "/health", label: "Health" },
  { keywords: /\b(insights?|analysis|trends?)\b/i, path: "/insights", label: "Insights" },
  { keywords: /\b(reports?|summary)\b/i, path: "/reports", label: "Reports" },
  { keywords: /\b(tax|taxes|itr|form ?16|26as)\b/i, path: "/tax", label: "Tax" },
  { keywords: /\b(risk profile|risk)\b/i, path: "/risk-profile", label: "Risk Profile" },
  { keywords: /\b(what-?if|calculator|projection)\b/i, path: "/what-if", label: "What-If" },
  { keywords: /\b(learn|books|commodities|mutual fund learn)\b/i, path: "/learn", label: "Learn" },
  { keywords: /\b(guide|help|how to)\b/i, path: "/guide", label: "Help & Guide" },
  { keywords: /\b(settings?|preferences)\b/i, path: "/settings", label: "Settings" },
  { keywords: /\b(wake word|voice settings)\b/i, path: "/settings/wake-word", label: "Wake Word Settings" },
  { keywords: /\b(gmail|gmail import)\b/i, path: "/gmail-import", label: "Gmail Import" },
  { keywords: /\b(auto-?link|gpay|payment sync)\b/i, path: "/auto-link", label: "Auto-Link" },
  { keywords: /\b(recurrences?)\b/i, path: "/reports", label: "Reports" },
]

/** Resolve a navigation target from text. */
export function resolveNavigation(text: string): NavTarget | null {
  for (const target of NAV_TARGETS) {
    if (target.keywords.test(text)) return target
  }
  return null
}
