import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"
import {
  computeAllocation,
  type BudgetSplit,
  type AllocationResult,
} from "@/shared/budget-allocation"

const SPLIT_KEYS: Array<keyof BudgetSplit> = ["needs", "wants", "savings"]

function parseSplit(input: unknown): BudgetSplit | null {
  if (!input || typeof input !== "object") return null
  const obj = input as Record<string, unknown>
  const needs = Number(obj.needs)
  const wants = Number(obj.wants)
  const savings = Number(obj.savings)
  if (![needs, wants, savings].every((n) => Number.isFinite(n) && n >= 0 && n <= 100)) return null
  if (needs + wants + savings === 0) return null
  return { needs, wants, savings }
}

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext()
    let body: { split?: unknown } = {}
    try {
      body = (await req.json()) as { split?: unknown }
    } catch {
      body = {}
    }
    const overrideSplit = parseSplit(body.split)

    const profile = await prisma.profile.findUnique({
      where: { id: ctx.profileId },
      select: { id: true, annualIncome: true, dateOfBirth: true },
    })
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    const monthlyIncome = profile.annualIncome ? profile.annualIncome / 12 : 0
    const age = profile.dateOfBirth
      ? Math.floor(
          (Date.now() - profile.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
        )
      : null

    const categories = await prisma.category.findMany({
      where: { type: "expense" },
      select: { id: true, name: true, icon: true, color: true },
      orderBy: { name: "asc" },
    })

    const result: AllocationResult = computeAllocation({
      monthlyIncome,
      age,
      split: overrideSplit,
      categories,
    })

    const total = result.totalNeeds + result.totalWants + result.totalSavings
    return NextResponse.json({
      ...result,
      monthlyIncome,
      totalSuggested: total,
      usingOverride: overrideSplit != null,
      appliedSplit: overrideSplit
        ? { ...overrideSplit }
        : result.ageBucket?.split ?? null,
    })
  } catch (e) {
    return handleAuthError(e)
  }
}

export async function GET() {
  return NextResponse.json({
    note: "POST with optional { split: { needs, wants, savings } } to get budget recommendations.",
    keys: SPLIT_KEYS,
  })
}
