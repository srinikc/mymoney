import { prisma } from "@/lib/prisma"

// ── Insurance Adequacy Check ────────────────────────────────────────
// Evaluates if insurance coverage is adequate for retirement planning.

export interface InsuranceAdequacyResult {
  health: HealthCheck
  termLife: TermLifeCheck
  vehicle: VehicleCheck[]
  criticalIllness: CriticalIllnessCheck
  summary: { score: number; maxScore: number; gaps: string[] }
}

export interface HealthCheck {
  hasCoverage: boolean
  currentCover: number
  recommendedCover: number
  coverType: string | null
  gap: number
  adequate: boolean
  notes: string[]
}

export interface TermLifeCheck {
  hasCoverage: boolean
  currentCover: number
  recommendedCover: number
  gap: number
  adequate: boolean
  maturityAge: number | null
  yearsRemaining: number | null
  taggedGoalId: number | null
  notes: string[]
}

export interface VehicleCheck {
  id: number
  name: string
  vehicleType: string | null
  premium: number
  validUntil: string | null
  adequate: boolean
  notes: string[]
}

export interface CriticalIllnessCheck {
  hasCoverage: boolean
  currentCover: number
  recommendedCover: number
  adequate: boolean
  notes: string[]
}

export async function checkInsuranceAdequacy(profileId: number): Promise<InsuranceAdequacyResult> {
  const [insurances, profile, expenses] = await Promise.all([
    prisma.insurance.findMany({
      where: { profileId },
      select: {
        id: true, name: true, insuranceType: true, healthCoverType: true,
        sumAssured: true, coverAmount: true, premium: true,
        termPolicyTerm: true, termMaturityAge: true,
        vehicleType: true, vehicleCoverValidity: true,
        renewalDate: true, notes: true,
      },
    }),
    prisma.profile.findUnique({
      where: { id: profileId },
      select: { annualIncome: true, dateOfBirth: true },
    }),
    prisma.expense.aggregate({
      where: { profileId, deletedAt: null },
      _sum: { amount: true },
    }),
  ])

  const annualIncome = Number(profile?.annualIncome || 0)
  const monthlyExpenses = Number(expenses._sum.amount || 0) / 12

  // ── Health Insurance ────────────────────────────────────────────
  const healthPolicies = insurances.filter((i) => i.insuranceType === "health")
  const totalHealthCover = healthPolicies.reduce((s, i) => s + Number(i.coverAmount || i.sumAssured || 0), 0)
  const recommendedHealthCover = Math.max(annualIncome * 0.5, 2500000) // ₹25L minimum or 50% income

  const healthNotes: string[] = []
  if (healthPolicies.length === 0) {
    healthNotes.push("No health insurance found. Highly recommended for retirement planning.")
  } else {
    if (totalHealthCover < recommendedHealthCover) {
      healthNotes.push(`Health cover ₹${(totalHealthCover / 100000).toFixed(1)}L is below recommended ₹${(recommendedHealthCover / 100000).toFixed(1)}L`)
    }
    const floaterPolicy = healthPolicies.find((i) => i.healthCoverType === "family_floater")
    if (floaterPolicy) {
      healthNotes.push("Family floater covers all members — verify adequacy for 60+ age.")
    }
    healthNotes.push("Medical inflation is ~14%. Review cover annually.")
  }

  // ── Term Life Insurance ─────────────────────────────────────────
  const termPolicies = insurances.filter((i) => i.insuranceType === "term_life")
  const totalTermCover = termPolicies.reduce((s, i) => s + Number(i.coverAmount || i.sumAssured || 0), 0)
  const recommendedTermCover = annualIncome * 10 // 10x annual income

  const currentAge = profile?.dateOfBirth
    ? Math.floor((Date.now() - new Date(profile.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null

  const termNotes: string[] = []
  if (termPolicies.length === 0) {
    termNotes.push("No term life insurance found. Critical for family protection.")
  } else {
    if (totalTermCover < recommendedTermCover) {
      termNotes.push(`Term cover ₹${(totalTermCover / 100000).toFixed(1)}L is below 10x income recommendation (₹${(recommendedTermCover / 100000).toFixed(1)}L)`)
    }
    for (const policy of termPolicies) {
      if (policy.termMaturityAge && currentAge && policy.termMaturityAge <= currentAge) {
        termNotes.push(`${policy.name}: Policy has matured. Consider renewal or new policy.`)
      } else if (policy.termMaturityAge && currentAge) {
        const yearsLeft = policy.termMaturityAge - currentAge
        termNotes.push(`${policy.name}: Matures at age ${policy.termMaturityAge} (${yearsLeft} years remaining)`)
      }
    }
  }

  // ── Vehicle Insurance ───────────────────────────────────────────
  const vehiclePolicies = insurances.filter((i) => i.insuranceType === "vehicle")
  const vehicleChecks: VehicleCheck[] = vehiclePolicies.map((v) => {
    const notes: string[] = []
    const now = new Date()
    const validUntil = v.vehicleCoverValidity ? new Date(v.vehicleCoverValidity) : null
    const adequate = validUntil ? validUntil > now : true

    if (!validUntil) {
      notes.push("No validity date set — verify policy is active")
    } else if (validUntil <= now) {
      notes.push("Policy has expired! Renew immediately.")
    } else {
      const daysUntilExpiry = Math.ceil((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      if (daysUntilExpiry < 30) {
        notes.push(`Policy expires in ${daysUntilExpiry} days. Renew soon.`)
      }
    }

    return {
      id: v.id,
      name: v.name,
      vehicleType: v.vehicleType,
      premium: Number(v.premium),
      validUntil: v.vehicleCoverValidity?.toISOString() || null,
      adequate,
      notes,
    }
  })

  // ── Critical Illness ────────────────────────────────────────────
  const ciPolicies = insurances.filter((i) => i.insuranceType === "critical_illness")
  const totalCICover = ciPolicies.reduce((s, i) => s + Number(i.coverAmount || i.sumAssured || 0), 0)
  const recommendedCICover = annualIncome * 2 // 2x annual income

  const ciNotes: string[] = []
  if (ciPolicies.length === 0) {
    ciNotes.push("No critical illness cover. Consider adding for comprehensive protection.")
  } else if (totalCICover < recommendedCICover) {
    ciNotes.push(`CI cover ₹${(totalCICover / 100000).toFixed(1)}L is below recommended ₹${(recommendedCICover / 100000).toFixed(1)}L`)
  }

  // ── Summary Score ───────────────────────────────────────────────
  let score = 0
  const maxScore = 4
  const gaps: string[] = []

  if (healthPolicies.length > 0 && totalHealthCover >= recommendedHealthCover) {
    score++
  } else if (healthPolicies.length > 0) {
    score += 0.5
    gaps.push("Health insurance cover is below recommended level")
  } else {
    gaps.push("No health insurance")
  }

  if (termPolicies.length > 0 && totalTermCover >= recommendedTermCover) {
    score++
  } else if (termPolicies.length > 0) {
    score += 0.5
    gaps.push("Term life cover is below recommended level")
  } else {
    gaps.push("No term life insurance")
  }

  if (vehicleChecks.every((v) => v.adequate)) {
    score++
  } else {
    gaps.push("Some vehicle insurance policies are expired or missing")
  }

  if (ciPolicies.length > 0 && totalCICover >= recommendedCICover) {
    score++
  } else if (ciPolicies.length > 0) {
    score += 0.5
    gaps.push("Critical illness cover is below recommended level")
  } else {
    gaps.push("No critical illness insurance")
  }

  return {
    health: {
      hasCoverage: healthPolicies.length > 0,
      currentCover: totalHealthCover,
      recommendedCover: recommendedHealthCover,
      coverType: healthPolicies[0]?.healthCoverType || null,
      gap: Math.max(0, recommendedHealthCover - totalHealthCover),
      adequate: totalHealthCover >= recommendedHealthCover,
      notes: healthNotes,
    },
    termLife: {
      hasCoverage: termPolicies.length > 0,
      currentCover: totalTermCover,
      recommendedCover: recommendedTermCover,
      gap: Math.max(0, recommendedTermCover - totalTermCover),
      adequate: totalTermCover >= recommendedTermCover,
      maturityAge: termPolicies[0]?.termMaturityAge || null,
      yearsRemaining: termPolicies[0]?.termMaturityAge && currentAge ? termPolicies[0].termMaturityAge - currentAge : null,
      taggedGoalId: null,
      notes: termNotes,
    },
    vehicle: vehicleChecks,
    criticalIllness: {
      hasCoverage: ciPolicies.length > 0,
      currentCover: totalCICover,
      recommendedCover: recommendedCICover,
      adequate: totalCICover >= recommendedCICover,
      notes: ciNotes,
    },
    summary: {
      score: Math.round(score * 10) / 10,
      maxScore,
      gaps,
    },
  }
}
