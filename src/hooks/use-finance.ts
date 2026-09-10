"use client"

import { useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import { apiFetch } from "@/hooks/use-dashboard"
import type { Investment, Goal, Category } from "@/types"
import { IncomeSourceResponseSchema, type IncomeSourceResponse } from "@/shared/income-validation"

export type IncomeSource = IncomeSourceResponse & { sourceCategory: string }

export interface IncomeSummary {
  totalMonthly: number
  totalYearly: number
  thisMonth: number
}

export function computeIncomeSummary(src: IncomeSource[]): IncomeSummary {
  const totalMonthly = src
    .filter((s) => s.type === "monthly")
    .reduce((sum, s) => sum + s.amount, 0)

  const totalYearly =
    src.filter((s) => s.type === "yearly").reduce((sum, s) => sum + s.amount, 0) +
    totalMonthly * 12 +
    src.filter((s) => s.type === "variable").reduce((sum, s) => sum + s.amount, 0) * 12

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const thisMonth = src
    .filter((s) => {
      if (!s.startDate) return false
      const start = new Date(s.startDate)
      if (start > now) return false
      if (s.type === "monthly") return true
      if (s.type === "yearly") return start.getMonth() === currentMonth && start.getFullYear() === currentYear
      if (s.type === "onetime") return start.getMonth() === currentMonth && start.getFullYear() === currentYear
      if (s.type === "variable") return true
      return false
    })
    .reduce((sum, s) => sum + s.amount, 0)

  return { totalMonthly, totalYearly, thisMonth }
}

export function useIncomeSources() {
  return useQuery({
    queryKey: queryKeys.incomeSources(),
    queryFn: async () => {
      const res = await fetch("/api/income/sources")
      if (!res.ok) throw new Error("Failed to fetch income sources")
      const data = await res.json()
      const raw = data.sources || data.data || data || []
      const rawList = Array.isArray(raw) ? raw : Array.isArray(data) ? data : []
      return rawList
        .map((s: unknown) => {
          const parsed = IncomeSourceResponseSchema.safeParse(s)
          if (!parsed.success) {
            console.warn("IncomeSource response validation failed:", parsed.error.issues)
            return null
          }
          return { ...parsed.data, sourceCategory: parsed.data.category?.name || "Other" }
        })
        .filter(Boolean) as IncomeSource[]
    },
  })
}

export interface CommonCategoryRow {
  categoryId: number
  category: { id: number; name: string; icon: string; color: string }
  subCategory: string | null
  lastMonthSpend: number
  currentBudget: number | null
  currentSpent: number
  budgetId: number | null
}

export interface OverviewResponse {
  overview: boolean
  month: number
  year: number
  income: number
  commonCategories: CommonCategoryRow[]
  totals: {
    current: { budget: number; spent: number }
    lastMonth: { budget: number; spent: number }
  }
}

export function useBudgetOverview(m: number, y: number) {
  return useQuery({
    queryKey: queryKeys.budgetsOverview(m, y),
    queryFn: () => apiFetch<OverviewResponse>(`/api/budgets/overview?month=${m}&year=${y}`),
  })
}

export function useBudgetCategoryTree() {
  return useQuery({
    queryKey: queryKeys.budgetCategoryTree(),
    queryFn: async () => {
      const res = await fetch("/api/categories?include=subCategories")
      const data = await res.json()
      if (data.subCategories) {
        return { categories: (data.categories || data) as Category[], subCategories: data.subCategories as string[] }
      }
      return { categories: data as Category[], subCategories: [] as string[] }
    },
  })
}

export function useInvestments() {
  return useQuery({
    queryKey: queryKeys.investments(),
    queryFn: () => apiFetch<Investment[]>("/api/investments"),
    select: (data) =>
      (Array.isArray(data) ? data : [])
        .filter((i) => i.type !== "fixed_deposit")
        .map((i) => ({
          ...i,
          returnPercent: i.amount > 0 ? Math.round(((i.currentValue - i.amount) / i.amount) * 100) : 0,
        })),
  })
}

export function useGoals() {
  return useQuery({
    queryKey: queryKeys.goals(),
    queryFn: () => apiFetch<Goal[]>("/api/goals"),
    select: (data) =>
      (Array.isArray(data) ? data : []).map((g) => ({
        ...g,
        progress: g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0,
      })),
  })
}

export interface Asset {
  id: number; name: string; type: string; amount: number; notes: string | null
}

export interface Liability {
  id: number; name: string; type: string; amount: number; interestRate: number | null; dueDate: string | null; notes: string | null
}

export function useAssets() {
  return useQuery({
    queryKey: queryKeys.assets(),
    queryFn: () => apiFetch<Asset[]>("/api/assets"),
    select: (data) => (Array.isArray(data) ? data : []),
  })
}

export function useLiabilities() {
  return useQuery({
    queryKey: queryKeys.liabilities(),
    queryFn: () => apiFetch<Liability[]>("/api/liabilities"),
    select: (data) => (Array.isArray(data) ? data : []),
  })
}

export interface HealthComponent {
  score: number; value: number; target: number; status: "good" | "warning" | "critical"
}

export interface GapItem {
  category: string; status: "good" | "warning" | "critical"; title: string; currentValue: string; targetValue: string; gap: string; gapAmount: number; actionItems: string[]
}

export interface Recommendation {
  id: string; category: string; priority: "high" | "medium" | "low"; title: string; description: string; action: string; impact: string; estimatedSavings?: number
}

export function useGapAnalysis() {
  return useQuery({
    queryKey: queryKeys.gapAnalysis(),
    queryFn: () => apiFetch<{ gaps: GapItem[] }>("/api/gap-analysis"),
    select: (data) => data,
  })
}

export function useRecommendations() {
  return useQuery({
    queryKey: queryKeys.recommendations(),
    queryFn: () => apiFetch<{ recommendations: Recommendation[] }>("/api/recommendations"),
    select: (data) => data.recommendations || [],
  })
}