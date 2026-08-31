export const ESSENTIAL_CATEGORIES = new Set([
  "dining-groceries",
  "healthcare",
  "commute",
  "fuel-topup",
  "utility-bills",
  "telecom",
  "rent-housing",
  "home-fixes",
  "auto-maintenance",
  "protection-premiums",
  "tax-govt",
  "daily-essentials",
  "office-supplies",
  "debt-repayment",
  "card-fees",
])

export const JOB_STABILITY: Record<string, { months: number; rationale: string }> = {
  government: { months: 3, rationale: "Stable public-sector role — 3 months is enough." },
  private: { months: 6, rationale: "Standard private-sector role — 6 months is the safe baseline." },
  self_employed: { months: 9, rationale: "Self-employed income is variable — keep 9 months for slow quarters." },
  freelance: { months: 9, rationale: "Freelance income is variable — keep 9 months for slow months." },
  business: { months: 12, rationale: "Business owners face cash-flow gaps — keep 12 months." },
  retired: { months: 6, rationale: "Pension is usually stable — 6 months for medical surprises." },
  student: { months: 3, rationale: "Students have low fixed costs — 3 months covers the gap year." },
  homemaker: { months: 3, rationale: "Homemaker with no dependents — 3 months is sufficient." },
  other: { months: 6, rationale: "Default safe baseline — 6 months of essentials." },
}

export interface EmergencyFundInput {
  monthlyEssentials: number
  dependents: number
  jobType: string
  monthlyIncome?: number
  existingSavings?: number
  months?: number
}

export interface EmergencyFundResult {
  months: number
  target: number
  existing: number
  gap: number
  runUpMonths: number
  monthlyRunUp: number
  rationale: string
  warnings: string[]
  tips: string[]
}

export function monthsForProfile(jobType: string, dependents: number): number {
  const base = JOB_STABILITY[jobType]?.months ?? 6
  if (dependents >= 3) return base + 3
  if (dependents >= 1) return base + 1
  return base
}

export function computeEmergencyFund(input: EmergencyFundInput): EmergencyFundResult {
  const months = input.months ?? monthsForProfile(input.jobType, input.dependents)
  const target = Math.round(input.monthlyEssentials * months)
  const existing = input.existingSavings ?? 0
  const gap = Math.max(0, target - existing)

  const runUpMonths = input.monthlyIncome
    ? Math.max(1, Math.ceil(gap / Math.max(1, input.monthlyIncome * 0.20)))
    : 12

  const monthlyRunUp = Math.ceil(gap / runUpMonths)

  const warnings: string[] = []
  if (input.monthlyEssentials <= 0) {
    warnings.push("Add expenses in essential categories (rent, groceries, utilities) so we can compute a target.")
  }
  if (gap === 0 && target > 0) {
    warnings.push("Your fund is fully funded. Review every 6 months.")
  } else if (gap > 0 && input.monthlyIncome && gap > input.monthlyIncome * 6) {
    warnings.push("Your gap is more than 6 months of income. Focus on increasing income or reducing non-essentials first.")
  }

  const tips: string[] = []
  if (gap > 0) {
    tips.push("Open a separate high-yield savings account. Examples: Fi Money, Niyo, Jupiter savings, IDFC First.")
    tips.push("Auto-debit on salary day — 1 hour after salary credits, not at month end.")
    tips.push("Don't touch this account for non-emergencies. A wedding is not an emergency.")
    tips.push("If your employer offers emergency advances, skip — they often cost 1-2% per month.")
  } else {
    tips.push("Top up every January for inflation (~6% per year).")
    tips.push("Park excess in a liquid fund or short-duration debt fund for slightly better returns.")
  }

  return {
    months,
    target,
    existing,
    gap,
    runUpMonths,
    monthlyRunUp,
    rationale: JOB_STABILITY[input.jobType]?.rationale ?? "Default safe baseline.",
    warnings,
    tips,
  }
}

export function recommendJobType(occupation: string | null | undefined): string {
  const o = (occupation || "").toLowerCase()
  if (o.includes("govt") || o.includes("government") || o.includes("psu")) return "government"
  if (o.includes("business") || o.includes("entrepreneur")) return "business"
  if (o.includes("freelance") || o.includes("consultant")) return "freelance"
  if (o.includes("self") || o.includes("shop") || o.includes("trader")) return "self_employed"
  if (o.includes("retired")) return "retired"
  if (o.includes("student")) return "student"
  if (o.includes("home") || o.includes("homemaker")) return "homemaker"
  return "private"
}
