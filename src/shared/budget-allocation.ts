export type BudgetBucket = "needs" | "wants" | "savings"

export interface BudgetSplit {
  needs: number
  wants: number
  savings: number
}

export interface AgeBucket {
  label: string
  minAge: number
  maxAge: number
  split: BudgetSplit
  rationale: string
}

export const AGE_BUCKETS: AgeBucket[] = [
  {
    label: "Early Career (≤25)",
    minAge: 0,
    maxAge: 25,
    split: { needs: 45, wants: 25, savings: 30 },
    rationale: "Low fixed costs and time on your side — invest aggressively in equity and skill-building.",
  },
  {
    label: "Growth (26-35)",
    minAge: 26,
    maxAge: 35,
    split: { needs: 50, wants: 25, savings: 25 },
    rationale: "Income rising but lifestyle creep is the biggest risk. Build the habit of paying yourself first.",
  },
  {
    label: "Mid-Career (36-50)",
    minAge: 36,
    maxAge: 50,
    split: { needs: 55, wants: 25, savings: 20 },
    rationale: "Family and EMIs dominate essentials. Keep retirement and kids' education funds on autopilot.",
  },
  {
    label: "Pre-Retirement (51-60)",
    minAge: 51,
    maxAge: 60,
    split: { needs: 60, wants: 20, savings: 20 },
    rationale: "Shift savings toward debt-free goals and conservative instruments. Healthcare costs climb.",
  },
  {
    label: "Retirement (61+)",
    minAge: 61,
    maxAge: 200,
    split: { needs: 65, wants: 20, savings: 15 },
    rationale: "Capital preservation. Drawdowns should be planned, not forced. Health insurance is essential.",
  },
]

export function bucketForAge(age: number | null | undefined): AgeBucket {
  if (age == null) return AGE_BUCKETS[1]
  return AGE_BUCKETS.find((b) => age >= b.minAge && age <= b.maxAge) ?? AGE_BUCKETS[1]
}

export function splitForAge(age: number | null | undefined): BudgetSplit {
  return bucketForAge(age).split
}

export const CATEGORY_TO_BUCKET: Record<string, BudgetBucket> = {
  "dining-groceries": "needs",
  "healthcare": "needs",
  "commute": "needs",
  "fuel-topup": "needs",
  "utility-bills": "needs",
  "telecom": "needs",
  "rent-housing": "needs",
  "home-fixes": "needs",
  "auto-maintenance": "needs",
  "protection-premiums": "needs",
  "grooming": "needs",
  "personal-care": "needs",
  "tax-govt": "needs",
  "daily-essentials": "needs",
  "office-supplies": "needs",
  "debt-repayment": "needs",
  "card-fees": "needs",

  "shopping-general": "wants",
  "apparel": "wants",
  "footwear": "wants",
  "fine-gold": "wants",
  "home-furnishing": "wants",
  "leisure": "wants",
  "religious-worship": "wants",
  "flowers-garlands": "wants",
  "festive-occasions": "wants",
  "gifting": "wants",
  "charity-giving": "wants",
  "adult-indulgence": "wants",
  "memory-keeping": "wants",

  "learning": "savings",
  "wealth-building": "savings",
  "equity": "savings",
}

export function bucketForCategory(name: string): BudgetBucket {
  return CATEGORY_TO_BUCKET[name] ?? "wants"
}

export interface CategoryWeight {
  needs?: number
  wants?: number
  savings?: number
}

export const CATEGORY_WEIGHTS: Record<string, CategoryWeight> = {
  "dining-groceries": { needs: 1.0 },
  "healthcare": { needs: 0.8, savings: 0.2 },
  "commute": { needs: 1.0 },
  "fuel-topup": { needs: 1.0 },
  "utility-bills": { needs: 1.0 },
  "telecom": { needs: 0.7, wants: 0.3 },
  "rent-housing": { needs: 1.0 },
  "home-fixes": { needs: 0.7, wants: 0.3 },
  "auto-maintenance": { needs: 1.0 },
  "protection-premiums": { needs: 0.6, savings: 0.4 },
  "grooming": { needs: 0.5, wants: 0.5 },
  "personal-care": { needs: 0.5, wants: 0.5 },
  "tax-govt": { needs: 1.0 },
  "daily-essentials": { needs: 1.0 },
  "office-supplies": { needs: 0.8, wants: 0.2 },
  "debt-repayment": { needs: 0.7, savings: 0.3 },
  "card-fees": { needs: 1.0 },

  "shopping-general": { wants: 1.0 },
  "apparel": { wants: 0.8, needs: 0.2 },
  "footwear": { wants: 0.7, needs: 0.3 },
  "fine-gold": { wants: 0.5, savings: 0.5 },
  "home-furnishing": { wants: 0.5, needs: 0.5 },
  "leisure": { wants: 1.0 },
  "religious-worship": { wants: 1.0 },
  "flowers-garlands": { wants: 1.0 },
  "festive-occasions": { wants: 0.7, needs: 0.3 },
  "gifting": { wants: 1.0 },
  "charity-giving": { wants: 0.7, savings: 0.3 },
  "adult-indulgence": { wants: 1.0 },
  "memory-keeping": { wants: 1.0 },

  "learning": { savings: 1.0 },
  "wealth-building": { savings: 1.0 },
  "equity": { savings: 1.0 },
}

export function weightsForCategory(name: string): CategoryWeight {
  return CATEGORY_WEIGHTS[name] ?? { wants: 1.0 }
}

export interface CategoryAllocation {
  categoryId: number
  categoryName: string
  bucket: BudgetBucket
  amount: number
  rationale: string
}

export interface AllocationResult {
  ageBucket: AgeBucket | null
  split: BudgetSplit
  totalNeeds: number
  totalWants: number
  totalSavings: number
  allocations: CategoryAllocation[]
  notes: string[]
}

export interface AllocationInput {
  monthlyIncome: number
  age: number | null
  split?: BudgetSplit | null
  categories: Array<{ id: number; name: string; icon?: string; color?: string }>
}

export function computeAllocation(input: AllocationInput): AllocationResult {
  const { monthlyIncome, age, categories } = input
  const ageBucket = age != null ? bucketForAge(age) : null
  const split = input.split ?? (ageBucket?.split ?? AGE_BUCKETS[1].split)
  const notes: string[] = []

  if (monthlyIncome <= 0) {
    notes.push("Set your annual income in Settings to unlock allocation suggestions.")
  }
  if (ageBucket) {
    notes.push(`Age bucket: ${ageBucket.label}. ${ageBucket.rationale}`)
  } else {
    notes.push("Set your date of birth in Settings to personalize suggestions.")
  }

  const bucketTotals = {
    needs: Math.round((monthlyIncome * split.needs) / 100),
    wants: Math.round((monthlyIncome * split.wants) / 100),
    savings: Math.round((monthlyIncome * split.savings) / 100),
  }

  const groups: Record<BudgetBucket, Array<{ id: number; name: string }>> = {
    needs: [],
    wants: [],
    savings: [],
  }
  for (const c of categories) {
    const b = bucketForCategory(c.name)
    groups[b].push(c)
  }

  const allocations: CategoryAllocation[] = []
  for (const bucket of ["needs", "wants", "savings"] as BudgetBucket[]) {
    const list = groups[bucket]
    if (list.length === 0) continue
    const totalWeight = list.reduce((sum, c) => {
      const w = weightsForCategory(c.name)
      const bw = w[bucket] ?? 0
      return sum + bw
    }, 0)
    const bucketAmount = bucketTotals[bucket]
    for (const c of list) {
      const w = weightsForCategory(c.name)
      const bw = w[bucket] ?? 0
      const share = totalWeight > 0 ? bw / totalWeight : 1 / list.length
      const amount = Math.round(bucketAmount * share)
      allocations.push({
        categoryId: c.id,
        categoryName: c.name,
        bucket,
        amount,
        rationale: rationaleFor(c.name, bucket, share),
      })
    }
  }

  return {
    ageBucket,
    split,
    totalNeeds: bucketTotals.needs,
    totalWants: bucketTotals.wants,
    totalSavings: bucketTotals.savings,
    allocations,
    notes,
  }
}

function rationaleFor(categoryName: string, bucket: BudgetBucket, share: number): string {
  const pct = Math.round(share * 100)
  if (bucket === "needs") {
    return `Essential. ${pct}% of the needs bucket.`
  }
  if (bucket === "wants") {
    return `Lifestyle. Cap at ${pct}% of the wants bucket to avoid lifestyle creep.`
  }
  return `Future-you. ${pct}% of the savings bucket.`
}

export const BUCKET_LABELS: Record<BudgetBucket, string> = {
  needs: "Needs",
  wants: "Wants",
  savings: "Savings & Investments",
}

export const BUCKET_DESCRIPTIONS: Record<BudgetBucket, string> = {
  needs: "Rent, groceries, utilities, commute, insurance, EMIs, healthcare",
  wants: "Dining out, shopping, leisure, gifting, festive spending",
  savings: "SIPs, equity, learning, gold (long-term), emergency fund top-up",
}

export const BUCKET_COLORS: Record<BudgetBucket, string> = {
  needs: "#3b82f6",
  wants: "#f59e0b",
  savings: "#10b981",
}
