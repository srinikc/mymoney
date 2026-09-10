"use client"

import { useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import { apiFetch } from "@/hooks/use-dashboard"
import type { Expense } from "@/types"
import type { RecurrenceReportItem } from "@/app/api/reports/recurrence/route"

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories(),
    queryFn: () => apiFetch<{ id: number; name: string }[]>("/api/categories"),
    select: (data) => (Array.isArray(data) ? data : []),
    staleTime: 5 * 60_000,
  })
}

export interface ReportExpenseParams {
  year: string | number
  month?: string
  quarter?: string
  search?: string
  categoryIds?: string
}

export function useReportExpenses(p: ReportExpenseParams) {
  const params = new URLSearchParams()
  params.set("year", String(p.year))
  params.set("pageSize", "500")
  if (p.month) params.set("month", p.month)
  if (p.quarter) params.set("quarter", p.quarter)
  if (p.search) params.set("search", p.search)
  if (p.categoryIds) params.set("categoryIds", p.categoryIds)
  const qs = params.toString()
  return useQuery({
    queryKey: queryKeys.expenses(qs),
    queryFn: () => apiFetch<{ data: Expense[] }>(`/api/expenses?${qs}`),
    select: (data) => data.data || [],
  })
}

export function useRecurrence(p: { year: string | number; month?: string; quarter?: string }) {
  const params = new URLSearchParams()
  params.set("year", String(p.year))
  if (p.month) params.set("month", p.month)
  if (p.quarter) params.set("quarter", p.quarter)
  const qs = params.toString()
  return useQuery({
    queryKey: queryKeys.recurrence(qs),
    queryFn: () => apiFetch<{ data: RecurrenceReportItem[] }>(`/api/reports/recurrence?${qs}`),
    select: (data) => data.data || [],
  })
}

export function useIntelligence() {
  return useQuery({
    queryKey: queryKeys.intelligence(),
    queryFn: () => apiFetch<{ items: IntelligenceItem[] }>("/api/intelligence"),
    select: (data) => data.items || [],
  })
}

export interface IntelligenceItem {
  id: string
  kind: "anomaly" | "velocity" | "subscription" | "tax-optimization" | "lifestyle-creep" | "seasonal" | "weekend-effect"
  title: string
  description: string
  metric: string
  severity: "info" | "warn" | "alert"
  actionable: string
  data?: Record<string, unknown>
}

export type PeriodType = "all" | "year" | "quarter" | "month" | "custom"

export interface DeepInsights {
  monthlyTrend: { month: string; amount: number; count: number }[]
  categoryBreakdown: { name: string; amount: number; count: number; color: string; subCategories: { name: string; amount: number; count: number }[] }[]
  personWise: { name: string; amount: number; count: number }[]
  topMerchants: { name: string; amount: number; count: number }[]
  yearlyComparison: { year: number; amount: number; count: number }[]
  optimization: { category: string; percentage: number; total: number; monthlyAvg: number; potentialSavings: number; subCategories: { name: string; amount: number; count: number }[] }[]
  deals: { merchant: string; title: string; discount: string; validUntil: string; description: string }[]
}

export function deepInsightsParams(period: PeriodType, periodYear: number): string {
  const params = new URLSearchParams()
  switch (period) {
    case "year":
      params.set("year", String(periodYear))
      break
    case "quarter": {
      const q = Math.floor(new Date().getMonth() / 3) + 1
      params.set("year", String(periodYear))
      params.set("quarter", String(q))
      break
    }
    case "month":
      params.set("year", String(periodYear))
      params.set("month", String(new Date().getMonth() + 1))
      break
  }
  return params.toString()
}

export function useDeepInsights(period: PeriodType, periodYear: number) {
  const params = deepInsightsParams(period, periodYear)
  return useQuery({
    queryKey: queryKeys.deepInsights(params),
    queryFn: () => apiFetch<DeepInsights>(`/api/insights/deep${params ? `?${params}` : ""}`),
  })
}

export interface YoyEntry {
  year: number
  amount: number
  count: number
  monthBreakdown: { month: string; amount: number; count: number }[]
}

export function useYoy(category: string) {
  const currentYear = new Date().getFullYear()
  const years = [currentYear - 2, currentYear - 1, currentYear].filter((y) => y >= 2020)
  return useQuery({
    queryKey: ["yoy", category, years.join(",")] as const,
    queryFn: () =>
      apiFetch<{ data: YoyEntry[] }>(
        `/api/insights/yoy?category=${encodeURIComponent(category)}&years=${years.join(",")}`
      ),
    enabled: !!category,
    select: (data) => data.data,
  })
}
