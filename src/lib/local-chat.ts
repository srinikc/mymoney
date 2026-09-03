// ── Data-Driven Chat Engine ──────────────────────────────────────────────
// Generates personalized, context-aware responses to common financial
// questions using the user's actual data. No LLM API key required.
// Works offline and is free. Falls back gracefully when no data exists.

import type { FinancialContext } from "./prompt-builder"

interface ResolvedContext extends FinancialContext {
  // Pre-computed values to make responses concise and consistent.
  monthlyExpense: number
  monthlyIncome: number
  netWorthValue: number
  topCategory: { name: string; amount: number } | null
  hasData: boolean
}

function inr(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN")
}

function pct(n: number, digits = 1): string {
  return n.toFixed(digits) + "%"
}

function pick<T>(arr: T[]): T | null {
  return arr.length > 0 ? (arr[0] as T) : null
}

function* matchAll(text: string, patterns: string[]): Generator<RegExpMatchArray | null> {
  for (const p of patterns) {
    const m = text.match(new RegExp(p, "i"))
    if (m) yield m
  }
}

export function detectIntent(q: string): string[] {
  const text = q.toLowerCase()
  const intents: string[] = []

  if (/\b(how much|what.{0,3}s|show|tell|give).*(spent|spend|expense|expenditure|paid)\b/.test(text) ||
      /\b(last|this|previous)\s+(month|week|year)\b/.test(text) && /(spend|paid|expense)/.test(text) ||
      /\b(monthly|month)\s+(spend|expense|budget|expenses)\b/.test(text)) {
    intents.push("spend-total")
  }
  if (/\b(top|biggest|highest|main|most)\b.*\b(category|expense|spend|where)\b/.test(text) ||
      /\bwhere\b.*\b(spend|spent|money|expense)/.test(text)) {
    intents.push("spend-category")
  }
  if (/\b(compare|comparison|versus|vs|diff|change)\b/.test(text) ||
      /\b(this|last|prev).{0,5}(month|week).{0,5}(this|last|prev|vs)/.test(text)) {
    intents.push("spend-compare")
  }
  if (/\b(over|exceed|exceeding|exceeded|breach|went over|gone over)\b.*\b(budget|limit|spend)/.test(text) ||
      /\bbudget\b.*\b(over|exceed|breach|status)/.test(text) ||
      /\b(am i|are we)\b.*\bover\b/.test(text)) {
    intents.push("budget-over")
  }
  if (/\b(how much|what|show|remaining|left|balance)\b.*\b(budget|left)/.test(text) ||
      /\bbudgets?\b.*\b(left|remaining|status|progress)/.test(text)) {
    intents.push("budget-status")
  }
  if (/\b(goal|goals|save|saving|target|savings|progress)\b/.test(text)) {
    intents.push("goals")
  }
  if (/\bemergency\b.*\b(fund|funds)\b/.test(text) ||
      /\bemergency fund\b/.test(text)) {
    intents.push("emergency-fund")
  }
  if (/\b(saving rate|save rate|how much.*(save|save per|save every month))\b/.test(text) ||
      /\bam i saving (enough|much)\b/.test(text)) {
    intents.push("savings-rate")
  }
  if (/\b(net worth|wealth|total assets|total liabilities)\b/.test(text)) {
    intents.push("net-worth")
  }
  if (/\b(health|score|health score|financial health)\b/.test(text)) {
    intents.push("health")
  }
  if (/\b(invest|investment|investments|portfolio|sip|mutual fund|stock|equity|fd|fixed deposit)\b/.test(text)) {
    intents.push("invest")
  }
  if (/\b(tax|itr|income tax|80c|80d|hra|tds)\b/.test(text)) {
    intents.push("tax")
  }
  if (/\b(debts|loan|loans|emi|credit card|borrowed|liabilities)\b/.test(text)) {
    intents.push("debt")
  }
  if (/\b(suggest|suggests|advice|tips|how can|how to|ways|where can|reduce|reduces|cut|cuts)\b/.test(text)) {
    intents.push("advice")
  }
  if (/\b(insurance|policies|lic|term|health insurance|life insurance)\b/.test(text)) {
    intents.push("insurance")
  }
  if (/\b(subscriptions|netflix|hotstar|amazon prime|ott|disney)\b/.test(text)) {
    intents.push("subscriptions")
  }

  return intents.length > 0 ? intents : ["general"]
}

function responseSpendTotal(ctx: ResolvedContext): string {
  if (ctx.monthlyExpense === 0 && ctx.totalExpenses === 0) {
    return "You haven't recorded any expenses yet. Start by adding expenses or importing your GPay/credit card transactions — then I can give you real numbers.\n\nGo to **Expenses → Import** to upload a GPay Takeout ZIP or bank statement."
  }

  const lines: string[] = []
  lines.push(`**This month: ${inr(ctx.monthlyExpense)}**`)
  if (ctx.totalExpenses > 0) {
    lines.push(`Total tracked spend: **${inr(ctx.totalExpenses)}**`)
  }
  if (ctx.monthlyIncome > 0) {
    const burn = (ctx.monthlyExpense / ctx.monthlyIncome) * 100
    lines.push(`That's **${pct(burn)}** of your estimated monthly income.`)
  }
  if (ctx.topCategory) {
    const share = ctx.monthlyExpense > 0 ? (ctx.topCategory.amount / ctx.monthlyExpense) * 100 : 0
    lines.push(`Top category: **${ctx.topCategory.name}** at ${inr(ctx.topCategory.amount)} (${pct(share)} of this month).`)
  }
  lines.push("")
  lines.push("For a per-day breakdown or category filter, go to **Expenses** and use the date/category filters.")
  return lines.join("\n")
}

function responseSpendCategory(ctx: ResolvedContext): string {
  if (ctx.topCategories.length === 0) {
    return "You don't have any categorised spend yet. Add categories to your expenses (Expenses → edit each transaction) and I can break this down for you."
  }

  const lines: string[] = ["**Your top spending categories (all tracked time):**", ""]
  ctx.topCategories.slice(0, 5).forEach((c, i) => {
    lines.push(`${i + 1}. **${c.name}** — ${inr(c.amount)}`)
  })
  lines.push("")
  lines.push("To drill into a specific category, open **Expenses** and use the category filter.")
  return lines.join("\n")
}

function responseBudgetOver(ctx: ResolvedContext): string {
  if (ctx.budgetStatus.length === 0) {
    return "You don't have any budgets set yet. Go to **Budgets** to create monthly limits per category — even rough numbers help you stay aware."
  }

  const over = ctx.budgetStatus.filter((b) => b.spent > b.limit)
  const near = ctx.budgetStatus.filter((b) => b.spent > b.limit * 0.8 && b.spent <= b.limit)

  const lines: string[] = []
  if (over.length === 0 && near.length === 0) {
    lines.push("✅ No budget is currently overspent. You're within limits across all categories.")
  } else {
    if (over.length > 0) {
      lines.push(`🚨 **${over.length} budget${over.length > 1 ? "s" : ""} overspent this month:**`)
      for (const b of over) {
        const pctOver = ((b.spent - b.limit) / b.limit) * 100
        lines.push(`- **${b.name}**: ${inr(b.spent)} / ${inr(b.limit)} (**${pct(pctOver)} over**)`)
      }
      lines.push("")
    }
    if (near.length > 0) {
      lines.push(`⚠️ **${near.length} budget${near.length > 1 ? "s" : ""} close to limit (≥80% used):**`)
      for (const b of near) {
        const used = (b.spent / b.limit) * 100
        lines.push(`- **${b.name}**: ${inr(b.spent)} / ${inr(b.limit)} (${pct(used)} used, ${inr(b.limit - b.spent)} left)`)
      }
      lines.push("")
    }
  }
  lines.push("Open **Budgets** for the full picture and to adjust limits.")
  return lines.join("\n")
}

function responseBudgetStatus(ctx: ResolvedContext): string {
  if (ctx.budgetStatus.length === 0) {
    return "No budgets set up yet. Go to **Budgets** to create them. A common starting point is the 50/30/20 rule (50% needs, 30% wants, 20% savings)."
  }

  const total = ctx.budgetStatus.reduce((s, b) => s + b.limit, 0)
  const spent = ctx.budgetStatus.reduce((s, b) => s + b.spent, 0)
  const left = total - spent
  const lines: string[] = [
    `**Monthly budget status:**`,
    `- Total budget: **${inr(total)}**`,
    `- Spent so far: **${inr(spent)}** (${total > 0 ? pct((spent / total) * 100) : "0%"})`,
    `- Remaining: **${inr(left)}**`,
    "",
    "**Per-category:**",
  ]
  ctx.budgetStatus.forEach((b) => {
    const used = b.limit > 0 ? (b.spent / b.limit) * 100 : 0
    const status = used > 100 ? "🚨 over" : used > 80 ? "⚠️ near limit" : "✅ ok"
    lines.push(`- ${status} **${b.name}**: ${inr(b.spent)} / ${inr(b.limit)} (${pct(used)})`)
  })
  return lines.join("\n")
}

function responseGoals(ctx: ResolvedContext): string {
  if (ctx.goals.length === 0) {
    return "You don't have any savings goals set up. Open **Goals** to create your first — start with an emergency fund (3-6 months of expenses) and a long-term goal (retirement, home, kids' education)."
  }

  const lines: string[] = ["**Your active goals:**", ""]
  ctx.goals.forEach((g) => {
    const pctComplete = g.target > 0 ? (g.saved / g.target) * 100 : 0
    const remaining = Math.max(0, g.target - g.saved)
    const status = pctComplete >= 100 ? "✅ Complete" : pctComplete >= 75 ? "🟢 on track" : pctComplete >= 50 ? "🟡 progress" : "🔴 behind"
    lines.push(`${status} **${g.name}** — saved ${inr(g.saved)} / ${inr(g.target)} (${pct(pctComplete)})${remaining > 0 ? `, **${inr(remaining)}** to go` : ""}`)
  })

  if (ctx.monthlyIncome > 0 && ctx.savingsRate !== undefined) {
    lines.push("")
    lines.push(`You're saving **${pct(ctx.savingsRate)}** of your income. A healthy target is 20%+.`)
  }
  lines.push("")
  lines.push("Open **Goals** to adjust targets, change monthly contributions, or add new goals.")
  return lines.join("\n")
}

function responseEmergencyFund(ctx: ResolvedContext): string {
  const efGoal = ctx.goals.find((g) => g.name.toLowerCase().includes("emergency"))
  const targetMonths = 6
  const target = ctx.monthlyExpense * targetMonths

  if (!efGoal) {
    return [
      `**Emergency fund status:** Not set up.`,
      ``,
      `Based on your monthly expenses of **${inr(ctx.monthlyExpense)}**, you should aim for **${inr(target)}** (6 months of expenses).`,
      ``,
      `Open **Goals** and create a goal called "Emergency Fund" with this target.`,
      `Keep it in a high-yield savings account or liquid mutual fund for instant access.`,
    ].join("\n")
  }

  const pct = (efGoal.saved / efGoal.target) * 100
  const monthsCovered = ctx.monthlyExpense > 0 ? efGoal.saved / ctx.monthlyExpense : 0
  return [
    `**Emergency fund: ${efGoal.name}**`,
    ``,
    `- Saved: **${inr(efGoal.saved)}** / ${inr(efGoal.target)} (${pct.toFixed(0)}%)`,
    `- This covers **${monthsCovered.toFixed(1)} months** of expenses (target: ${targetMonths} months = ${inr(target)})`,
    ``,
    pct >= 100
      ? "✅ Fully funded. Consider investing any excess for better returns."
      : pct >= 50
      ? `🟡 On track. Keep adding **${inr((efGoal.target - efGoal.saved) / 12)}/month** to reach the goal in ~12 months.`
      : `🔴 Behind. To catch up, add **${inr((efGoal.target - efGoal.saved) / 6)}/month** for 6 months.`,
  ].join("\n")
}

function responseSavingsRate(ctx: ResolvedContext): string {
  if (ctx.monthlyIncome === 0) {
    return "I need income data to calculate your savings rate. Go to **Income** to add your income sources (salary, business, other)."
  }

  const rate = ctx.savingsRate ?? 0
  const target = 20
  const monthlySurplus = ctx.monthlyIncome - ctx.monthlyExpense

  const lines: string[] = [
    `**Your savings rate: ${pct(rate)}**`,
    ``,
    `- Estimated monthly income: **${inr(ctx.monthlyIncome)}**`,
    `- This month's expenses: **${inr(ctx.monthlyExpense)}**`,
    `- Monthly surplus: **${inr(monthlySurplus)}**`,
    ``,
  ]

  if (rate >= target) {
    lines.push(`✅ Above the **${target}%** target. Consider investing the surplus in index funds or equity for long-term growth.`)
  } else if (rate >= 10) {
    lines.push(`🟡 Below the **${target}%** target. Try to reduce discretionary spending (dining out, subscriptions) by ${inr(ctx.monthlyIncome * (target - rate) / 100)}/month.`)
  } else if (rate > 0) {
    lines.push(`🔴 Low. You need an extra **${inr(ctx.monthlyIncome * (target - rate) / 100)}/month** in savings. Look at your top spending category first.`)
  } else {
    lines.push(`🚨 You're spending more than you earn. Focus on reducing your top spending category this month.`)
  }

  return lines.join("\n")
}

function responseNetWorth(ctx: ResolvedContext): string {
  if (ctx.netWorth.assets === 0 && ctx.netWorth.liabilities === 0) {
    return "No assets or liabilities recorded yet. Open **Assets** to add what you own (property, gold, investments) and **Liabilities** for what you owe (loans, credit cards)."
  }

  return [
    `**Net worth: ${inr(ctx.netWorthValue)}**`,
    ``,
    `- Total assets: **${inr(ctx.netWorth.assets)}**`,
    `- Total liabilities: **${inr(ctx.netWorth.liabilities)}**`,
    ``,
    ctx.netWorthValue > 0
      ? "✅ Positive net worth. Track monthly to watch it grow — aim for 10-15% annual growth."
      : "🔴 Negative net worth. Focus on paying down high-interest debt first (credit cards, personal loans).",
  ].join("\n")
}

function responseHealth(ctx: ResolvedContext): string {
  const lines: string[] = []

  if (ctx.healthScore !== undefined) {
    const score = ctx.healthScore
    const rating = score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Fair" : "Needs work"
    lines.push(`**Financial health: ${score}/100 (${rating})**`)
  } else {
    lines.push(`**Financial health:**`)
  }

  lines.push("")

  // Calculate simple components
  const savingsHealth = ctx.savingsRate !== undefined
    ? ctx.savingsRate >= 20 ? "✅ savings rate healthy" : "⚠️ savings rate below 20%"
    : "—"
  const budgetHealth = ctx.budgetStatus.length > 0
    ? ctx.budgetStatus.every((b) => b.spent <= b.limit) ? "✅ within budget" : "⚠️ overspending"
    : "—"
  const emergencyHealth = ctx.goals.some((g) => g.name.toLowerCase().includes("emergency"))
    ? "✅ emergency fund tracked"
    : "⚠️ no emergency fund goal"
  const debtHealth = ctx.netWorth.liabilities > ctx.netWorth.assets * 0.5
    ? "⚠️ high debt-to-asset ratio"
    : "✅ debt manageable"

  lines.push(`- Savings: ${savingsHealth}`)
  lines.push(`- Budgets: ${budgetHealth}`)
  lines.push(`- Emergency fund: ${emergencyHealth}`)
  lines.push(`- Debt: ${debtHealth}`)
  lines.push("")
  lines.push("Visit **Health** page for detailed metrics and recommendations.")
  return lines.join("\n")
}

function responseInvest(ctx: ResolvedContext): string {
  const lines: string[] = []

  if (ctx.investments && ctx.investments.length > 0) {
    const total = ctx.investments.reduce((s, i) => s + i.currentValue, 0)
    const invested = ctx.investments.reduce((s, i) => s + i.amount, 0)
    const gain = total - invested
    const gainPct = invested > 0 ? (gain / invested) * 100 : 0
    lines.push(`**Your investment portfolio:**`)
    lines.push(`- Total current value: **${inr(total)}**`)
    lines.push(`- Amount invested: **${inr(invested)}**`)
    lines.push(`- Gain: **${inr(gain)}** (${pct(gainPct)})`)
    lines.push("")
    lines.push("**Holdings:**")
    ctx.investments.slice(0, 5).forEach((i) => {
      const ret = i.amount > 0 ? ((i.currentValue - i.amount) / i.amount) * 100 : 0
      lines.push(`- **${i.name}**: ${inr(i.currentValue)} (${ret >= 0 ? "+" : ""}${pct(ret)})`)
    })
  } else {
    lines.push("You don't have any investments tracked yet. Open **Investments** to add mutual funds, stocks, FDs, or other assets.")
  }

  lines.push("")
  lines.push("**Quick principles:**")
  lines.push("- Diversify across equity (NIFTY 50 index funds), debt, and gold")
  lines.push("- Use monthly SIPs — even ₹1,000/month compounds significantly over 10+ years")
  lines.push("- Keep 3-6 months expenses in cash before investing aggressively")
  return lines.join("\n")
}

function responseTax(ctx: ResolvedContext): string {
  return [
    "**Tax planning tips for FY 2024-25 (India):**",
    "",
    "- **80C** (max ₹1.5L): ELSS, PPF, EPF, home loan principal, life insurance",
    "- **80D** (₹25K-₹1L based on age): Health insurance premiums",
    "- **80CCD(1B)**: Extra ₹50K for NPS contribution",
    "- **HRA exemption**: If you pay rent, claim HRA from salary",
    "- **LTCG on equity**: 10% on gains above ₹1.25L/year",
    "",
    `Based on your monthly income of **${ctx.monthlyIncome > 0 ? inr(ctx.monthlyIncome) : "—"}**, your estimated annual tax slab falls in ${ctx.monthlyIncome * 12 > 1500000 ? "30%" : ctx.monthlyIncome * 12 > 1000000 ? "20%" : ctx.monthlyIncome * 12 > 500000 ? "10%" : "0-5%"}.`,
    "",
    "Open **Tax** page for ITR tracking and projections.",
  ].join("\n")
}

function responseDebt(ctx: ResolvedContext): string {
  if (ctx.netWorth.liabilities === 0) {
    return "You have no liabilities recorded. If you have loans or credit card debt, add them in **Liabilities** so I can help you plan payoff."
  }

  const debtToIncome = ctx.monthlyIncome > 0 ? (ctx.netWorth.liabilities / (ctx.monthlyIncome * 12)) * 100 : 0
  const lines: string[] = [
    `**Total debt: ${inr(ctx.netWorth.liabilities)}**`,
    ``,
    `- Debt-to-annual-income: **${pct(debtToIncome)}** (healthy: <30%)`,
    ``,
  ]

  if (debtToIncome > 50) {
    lines.push(`🔴 High debt. Prioritize paying off high-interest debt first (credit cards ~40% APR). Consider debt consolidation.`)
  } else if (debtToIncome > 30) {
    lines.push(`🟡 Moderate debt. Pay above the minimum and prioritize highest-APR loans.`)
  } else {
    lines.push(`✅ Debt is manageable. Stay on top of EMIs and avoid new high-interest debt.`)
  }

  lines.push("")
  lines.push("Open **Loans** to view EMI schedule and prepayment impact.")
  return lines.join("\n")
}

function responseAdvice(ctx: ResolvedContext): string {
  const lines: string[] = ["Based on your data, here are 3 quick wins:", ""]

  if (ctx.savingsRate !== undefined && ctx.savingsRate < 20) {
    lines.push(`1. **Save more**: You're at ${pct(ctx.savingsRate)} — target 20%. Try cutting your top category by 10%.`)
  }
  if (ctx.budgetStatus.some((b) => b.spent > b.limit)) {
    lines.push(`2. **Fix overspent budgets**: ${ctx.budgetStatus.filter((b) => b.spent > b.limit).map((b) => b.name).join(", ")} need attention.`)
  }
  if (!ctx.goals.some((g) => g.name.toLowerCase().includes("emergency"))) {
    lines.push(`3. **Start an emergency fund**: Aim for ${inr(ctx.monthlyExpense * 6)} (6 months of expenses).`)
  }
  if (ctx.investments && ctx.investments.length === 0 && ctx.monthlyIncome > 0) {
    lines.push(`4. **Begin investing**: Even ₹1,000/month in a NIFTY 50 index fund beats keeping cash idle.`)
  }
  if (lines.length === 1) {
    lines.push("Looking solid. Check back next month for updated suggestions.")
  }
  return lines.join("\n")
}

function responseInsurance(ctx: ResolvedContext): string {
  return [
    "**Insurance basics for India:**",
    "",
    "- **Term life insurance**: 10-15x your annual income. ~₹500-1,000/year for ₹1Cr cover at age 30.",
    "- **Health insurance**: Minimum ₹5L cover, ₹10-15L for families in metros. Covers hospitalization.",
    "- **Critical illness**: Optional add-on, useful if family has medical history.",
    "",
    "Open **Insurance** to track your existing policies (premium, sum assured, renewal date).",
  ].join("\n")
}

function responseSubscriptions(ctx: ResolvedContext): string {
  return [
    "Track your recurring subscriptions in **Subscriptions** (Netflix, Spotify, gym, apps).",
    "",
    "**Quick audit tip**: Review your credit card statement monthly for unused subscriptions — most people save ₹500-2,000/month this way.",
  ].join("\n")
}

function responseSpendCompare(ctx: ResolvedContext): string {
  // Use recentTransactions to estimate this-month vs prior pattern
  if (ctx.recentTransactions.length === 0) {
    return "Add some expenses first, then I can compare periods. Start with **Expenses → Add Expense** or import a GPay Takeout ZIP."
  }
  const thisMonthTxns = ctx.recentTransactions
  const total = thisMonthTxns.reduce((s, t) => s + t.amount, 0)
  return [
    `**Recent spending (last ${thisMonthTxns.length} transactions): ${inr(total)}**`,
    "",
    "To compare month-over-month, open **Expenses** and use the month filter dropdown — the dashboard shows this-month vs last-month at a glance.",
  ].join("\n")
}

function responseGeneral(ctx: ResolvedContext): string {
  const hasSomeData = ctx.totalExpenses > 0 || ctx.goals.length > 0 || ctx.budgetStatus.length > 0 || ctx.investments && ctx.investments.length > 0

  if (!hasSomeData) {
    return [
      "Welcome! I'm MyMoney AI. I can help you with:",
      "",
      "- **Track spending** — add expenses or import a GPay Takeout ZIP",
      "- **Set budgets** — monthly limits per category",
      "- **Save goals** — emergency fund, vacation, home, etc.",
      "- **Investments** — track MFs, stocks, FDs",
      "- **Net worth & tax planning**",
      "",
      "Once you add some data, I can give you personalized answers based on your actual numbers.",
    ].join("\n")
  }

  return [
    "I can help with your finances. Try asking:",
    "",
    "- \"How much did I spend this month?\"",
    "- \"Am I over budget?\"",
    "- \"What's my savings rate?\"",
    "- \"How is my emergency fund?\"",
    "- \"What's my net worth?\"",
    "- \"Suggest ways to save money\"",
  ].join("\n")
}

export function generateLocalResponse(
  question: string,
  ctx: FinancialContext & { monthlyExpense: number; monthlyIncome: number; netWorthValue: number; topCategory: { name: string; amount: number } | null; hasData: boolean },
): string {
  const intents = detectIntent(question)
  const parts: string[] = []

  for (const intent of intents) {
    switch (intent) {
      case "spend-total": parts.push(responseSpendTotal(ctx)); break
      case "spend-category": parts.push(responseSpendCategory(ctx)); break
      case "spend-compare": parts.push(responseSpendCompare(ctx)); break
      case "budget-over": parts.push(responseBudgetOver(ctx)); break
      case "budget-status": parts.push(responseBudgetStatus(ctx)); break
      case "goals": parts.push(responseGoals(ctx)); break
      case "emergency-fund": parts.push(responseEmergencyFund(ctx)); break
      case "savings-rate": parts.push(responseSavingsRate(ctx)); break
      case "net-worth": parts.push(responseNetWorth(ctx)); break
      case "health": parts.push(responseHealth(ctx)); break
      case "invest": parts.push(responseInvest(ctx)); break
      case "tax": parts.push(responseTax(ctx)); break
      case "debt": parts.push(responseDebt(ctx)); break
      case "advice": parts.push(responseAdvice(ctx)); break
      case "insurance": parts.push(responseInsurance(ctx)); break
      case "subscriptions": parts.push(responseSubscriptions(ctx)); break
      default: parts.push(responseGeneral(ctx)); break
    }
  }

  // Deduplicate: only keep the most specific answer
  // If the only intent is "general", return the general answer
  if (intents.length === 1 && intents[0] === "general") {
    return responseGeneral(ctx)
  }

  return parts.join("\n\n---\n\n")
}
