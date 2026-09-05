import { prisma } from "@/lib/prisma"

// ── Layer 1: Auto-included items (100% retirement) ─────────────────
// NPS, EPF, Pension — always 100% retirement unless user opts out

// ── Layer 2: Tagged items via InvestmentGoalAllocation ──────────────
// Investments, Assets, FDs, Cash — user-tagged to goals

// ── Layer 3: Insurance (conditional) ───────────────────────────────
// Term life — only if maturity_age is within retirement horizon

export interface AggregatedCorpus {
  total: number
  breakdown: {
    auto: { items: AutoIncludedItem[]; total: number }
    tagged: { items: TaggedItem[]; total: number }
    insurance: { items: InsuranceItem[]; total: number }
  }
  subGoalBreakdown: SubGoalCorpus[]
}

export interface AutoIncludedItem {
  id: number
  type: string
  name: string
  value: number
  reason: string
}

export interface TaggedItem {
  id: number
  type: string
  name: string
  value: number
  goalId: number
  goalName: string
  allocationPct: number
  allocationValue: number
}

export interface InsuranceItem {
  id: number
  name: string
  coverAmount: number
  maturityAge: number | null
  taggedGoalId: number | null
  taggedGoalName: string | null
}

export interface SubGoalCorpus {
  goalId: number
  goalName: string
  corpus: number
  targetAmount: number
  items: { type: string; name: string; value: number }[]
}

export async function aggregateRetirementCorpus(profileId: number): Promise<AggregatedCorpus> {
  // Fetch all items in parallel
  const [investments, assets, fixedDeposits, cashBalances, insurances, allocations, profile] = await Promise.all([
    prisma.investment.findMany({ where: { profileId }, select: { id: true, type: true, name: true, currentValue: true, amount: true } }),
    prisma.asset.findMany({ where: { profileId }, select: { id: true, name: true, type: true, currentValue: true } }),
    prisma.fixedDeposit.findMany({ where: { profileId }, select: { id: true, principal: true, maturityAmount: true, bankAccount: { select: { bankName: true } } } }),
    prisma.cashBalance.findMany({ where: { profileId }, select: { id: true, amount: true, notes: true } }),
    prisma.insurance.findMany({ where: { profileId }, select: { id: true, name: true, insuranceType: true, termMaturityAge: true, coverAmount: true, sumAssured: true } }),
    prisma.investmentGoalAllocation.findMany({
      where: { goal: { profileId, type: "Retirement" } },
      include: { goal: { select: { id: true, name: true } } },
    }),
    prisma.profile.findUnique({ where: { id: profileId }, select: { dateOfBirth: true } }),
  ])

  // ── Layer 1: Auto-included (NPS, EPF, Pension) ──────────────────
  const autoTypes = ["NPS", "EPF", "Pension", "Gratuity"]
  const autoIncluded: AutoIncludedItem[] = investments
    .filter((inv) => autoTypes.some((t) => inv.type.toUpperCase().includes(t)))
    .map((inv) => ({
      id: inv.id,
      type: inv.type,
      name: inv.name,
      value: Number(inv.currentValue || inv.amount),
      reason: "Auto-included (retirement-only instrument)",
    }))

  const autoTotal = autoIncluded.reduce((s, i) => s + i.value, 0)

  // ── Layer 2: Tagged items via allocations ────────────────────────
  const taggedItems: TaggedItem[] = allocations
    .filter((a) => a.investmentId || a.assetId || a.fixedDepositId || a.cashId)
    .map((a) => {
      let value = 0
      let type = ""
      let name = ""

      if (a.investmentId) {
        const inv = investments.find((i) => i.id === a.investmentId)
        if (inv) { value = Number(inv.currentValue || inv.amount); type = inv.type; name = inv.name }
      } else if (a.assetId) {
        const asset = assets.find((i) => i.id === a.assetId)
        if (asset) { value = Number(asset.currentValue); type = asset.type; name = asset.name }
      } else if (a.fixedDepositId) {
        const fd = fixedDeposits.find((i) => i.id === a.fixedDepositId)
        if (fd) { value = Number(fd.maturityAmount || fd.principal); type = "FD"; name = `${fd.bankAccount?.bankName || "FD"}` }
      } else if (a.cashId) {
        const cash = cashBalances.find((i) => i.id === a.cashId)
        if (cash) { value = Number(cash.amount); type = "Cash"; name = cash.notes || "Cash Balance" }
      }

      const allocationValue = value * (a.allocationPct / 100)
      return {
        id: a.id,
        type,
        name,
        value,
        goalId: a.goalId,
        goalName: a.goal.name,
        allocationPct: a.allocationPct,
        allocationValue: Math.round(allocationValue),
      }
    })

  const taggedTotal = taggedItems.reduce((s, i) => s + i.allocationValue, 0)

  // ── Layer 3: Insurance (term life conditional) ──────────────────
  const currentAge = profile?.dateOfBirth
    ? Math.floor((Date.now() - new Date(profile.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null

  const insuranceItems: InsuranceItem[] = insurances
    .filter((ins) => ins.insuranceType === "term_life" && ins.termMaturityAge && currentAge && ins.termMaturityAge > currentAge)
    .map((ins) => {
      const tagged = allocations.find((a) => a.insuranceId === ins.id)
      return {
        id: ins.id,
        name: ins.name,
        coverAmount: Number(ins.coverAmount || ins.sumAssured || 0),
        maturityAge: ins.termMaturityAge,
        taggedGoalId: tagged?.goalId ?? null,
        taggedGoalName: tagged?.goal.name ?? null,
      }
    })

  const insuranceTotal = insuranceItems.reduce((s, i) => s + i.coverAmount, 0)

  // ── Sub-goal breakdown ──────────────────────────────────────────
  const retirementGoals = await prisma.goal.findMany({
    where: { profileId, type: "Retirement", isRetirementParent: true },
    include: { childGoals: true },
  })

  const subGoalBreakdown: SubGoalCorpus[] = []

  for (const parent of retirementGoals) {
    for (const child of parent.childGoals) {
      const childAllocations = allocations.filter((a) => a.goalId === child.id)
      const childCorpus = childAllocations.reduce((s, a) => {
        let value = 0
        if (a.investmentId) {
          const inv = investments.find((i) => i.id === a.investmentId)
          if (inv) value = Number(inv.currentValue || inv.amount)
        } else if (a.assetId) {
          const asset = assets.find((i) => i.id === a.assetId)
          if (asset) value = Number(asset.currentValue)
        } else if (a.fixedDepositId) {
          const fd = fixedDeposits.find((i) => i.id === a.fixedDepositId)
          if (fd) value = Number(fd.maturityAmount || fd.principal)
        } else if (a.cashId) {
          const cash = cashBalances.find((i) => i.id === a.cashId)
          if (cash) value = Number(cash.amount)
        }
        return s + value * (a.allocationPct / 100)
      }, 0)

      subGoalBreakdown.push({
        goalId: child.id,
        goalName: child.name,
        corpus: Math.round(childCorpus),
        targetAmount: Number(child.targetAmount),
        items: childAllocations.map((a) => {
          let value = 0; let type = ""; let name = ""
          if (a.investmentId) {
            const inv = investments.find((i) => i.id === a.investmentId)
            if (inv) { value = Number(inv.currentValue || inv.amount); type = inv.type; name = inv.name }
          } else if (a.assetId) {
            const asset = assets.find((i) => i.id === a.assetId)
            if (asset) { value = Number(asset.currentValue); type = asset.type; name = asset.name }
          }
          return { type, name, value: Math.round(value * (a.allocationPct / 100)) }
        }),
      })
    }
  }

  return {
    total: Math.round(autoTotal + taggedTotal + insuranceTotal),
    breakdown: {
      auto: { items: autoIncluded, total: Math.round(autoTotal) },
      tagged: { items: taggedItems, total: Math.round(taggedTotal) },
      insurance: { items: insuranceItems, total: Math.round(insuranceTotal) },
    },
    subGoalBreakdown,
  }
}
