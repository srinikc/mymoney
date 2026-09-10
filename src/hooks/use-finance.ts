"use client"

import { useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import { apiFetch } from "@/hooks/use-dashboard"

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

export interface HealthScore {
  overall: number; components: Record<string, HealthComponent>; recommendations: string[]
}

export function useHealthScoreFull() {
  return useQuery({
    queryKey: queryKeys.healthScore(),
    queryFn: () => apiFetch<HealthScore>("/api/health-score"),
  })
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