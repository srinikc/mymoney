import { prisma } from "@/lib/prisma"

// ── Goal Discovery ──────────────────────────────────────────────────
// Auto-detects existing goals that could be sub-goals of a retirement goal.

export interface DiscoverySuggestion {
  goalId: number
  goalName: string
  goalType: string
  targetAmount: number
  deadline: Date | null
  reason: string
  confidence: "high" | "medium" | "low"
}

export interface DiscoveryResult {
  retirementGoalId: number | null
  suggestions: DiscoverySuggestion[]
  autoIncluded: { type: string; name: string; value: number; reason: string }[]
}

const SUB_GOAL_CANDIDATE_TYPES = new Set([
  "Marriage",
  "Marriages",
  "Health",
  "Education",
  "Functions",
  "Custom",
])

export async function discoverSubGoals(profileId: number): Promise<DiscoveryResult> {
  // Find retirement goals
  const retirementGoals = await prisma.goal.findMany({
    where: { profileId, type: "Retirement" },
    select: { id: true, name: true, retirementAge: true },
  })

  const retirementGoal = retirementGoals[0] || null
  const retirementAge = retirementGoal?.retirementAge || 60

  // Find all goals for this profile that are NOT already sub-goals
  const allGoals = await prisma.goal.findMany({
    where: {
      profileId,
      parentGoalId: null, // not already a sub-goal
      id: retirementGoal ? { not: retirementGoal.id } : undefined,
    },
    select: { id: true, name: true, type: true, targetAmount: true, deadline: true, purpose: true },
  })

  // Find investments with retirement-related purposes
  const retirementPurposes = ["retirement", "pension", "nps", "epf", "gratuity"]
  const retirementInvestments = await prisma.investment.findMany({
    where: {
      profileId,
      OR: [
        { purpose: { contains: "retirement", mode: "insensitive" } },
        { purpose: { contains: "pension", mode: "insensitive" } },
        { type: { in: ["NPS", "EPF", "Pension"] } },
      ],
    },
    select: { id: true, type: true, name: true, currentValue: true, amount: true },
  })

  const suggestions: DiscoverySuggestion[] = []

  for (const goal of allGoals) {
    const isSubGoalCandidate = SUB_GOAL_CANDIDATE_TYPES.has(goal.type)
    const hasRetirementPurpose = goal.purpose?.toLowerCase().includes("retirement")

    if (isSubGoalCandidate || hasRetirementPurpose) {
      // Calculate confidence based on type and timing
      let confidence: "high" | "medium" | "low" = "low"
      let reason = ""

      if (goal.type === "Health") {
        confidence = "high"
        reason = "Health goals after age 55 are retirement healthcare needs"
      } else if (goal.type === "Marriage" || goal.type === "Marriages") {
        // Check if deadline falls during retirement years
        if (goal.deadline) {
          const deadlineYear = new Date(goal.deadline).getFullYear()
          const currentYear = new Date().getFullYear()
          const yearsUntilDeadline = deadlineYear - currentYear
          if (yearsUntilDeadline >= retirementAge - 10) {
            confidence = "high"
            reason = "Marriage goal falls during or near retirement years"
          } else {
            confidence = "medium"
            reason = "Marriage goal is pre-retirement but could overlap"
          }
        } else {
          confidence = "medium"
          reason = "Marriage goal without deadline — may fall during retirement"
        }
      } else if (goal.type === "Education") {
        if (goal.deadline) {
          const deadlineYear = new Date(goal.deadline).getFullYear()
          const currentYear = new Date().getFullYear()
          const yearsUntilDeadline = deadlineYear - currentYear
          if (yearsUntilDeadline >= retirementAge - 10) {
            confidence = "high"
            reason = "Education goal falls during or near retirement years"
          } else {
            confidence = "low"
            reason = "Education goal is pre-retirement — likely standalone"
          }
        } else {
          confidence = "medium"
          reason = "Education goal without deadline — may overlap with retirement"
        }
      } else if (hasRetirementPurpose) {
        confidence = "high"
        reason = "Goal has retirement-related purpose"
      } else if (goal.type === "Functions") {
        confidence = "medium"
        reason = "Function goals may overlap with retirement years"
      } else if (goal.type === "Custom") {
        confidence = "low"
        reason = "Custom goal — review if it relates to retirement"
      }

      suggestions.push({
        goalId: goal.id,
        goalName: goal.name,
        goalType: goal.type,
        targetAmount: Number(goal.targetAmount),
        deadline: goal.deadline,
        reason,
        confidence,
      })
    }
  }

  // Sort by confidence
  const confidenceOrder = { high: 0, medium: 1, low: 2 }
  suggestions.sort((a, b) => confidenceOrder[a.confidence] - confidenceOrder[b.confidence])

  // Auto-included investments
  const autoIncluded = retirementInvestments.map((inv) => ({
    type: inv.type,
    name: inv.name,
    value: Number(inv.currentValue || inv.amount),
    reason: inv.type.toUpperCase().includes("NPS") || inv.type.toUpperCase().includes("EPF")
      ? `Auto-included: ${inv.type} is always 100% retirement`
      : `Has retirement purpose: ${inv.type}`,
  }))

  return {
    retirementGoalId: retirementGoal?.id || null,
    suggestions,
    autoIncluded,
  }
}

// ── Apply Sub-Goal Linkage ──────────────────────────────────────────

export async function linkSubGoal(retirementGoalId: number, childGoalId: number): Promise<void> {
  // Verify both goals exist and belong to same profile
  const [parent, child] = await Promise.all([
    prisma.goal.findUnique({ where: { id: retirementGoalId } }),
    prisma.goal.findUnique({ where: { id: childGoalId } }),
  ])

  if (!parent || !child) throw new Error("Goal not found")
  if (parent.profileId !== child.profileId) throw new Error("Goals must belong to the same profile")
  if (parent.type !== "Retirement") throw new Error("Parent goal must be of type Retirement")

  await prisma.goal.update({
    where: { id: childGoalId },
    data: { parentGoalId: retirementGoalId },
  })
}

export async function unlinkSubGoal(childGoalId: number): Promise<void> {
  await prisma.goal.update({
    where: { id: childGoalId },
    data: { parentGoalId: null },
  })
}
