"use client"

import { useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import { apiFetch } from "@/hooks/use-dashboard"
import type { Investment, Goal } from "@/types"

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