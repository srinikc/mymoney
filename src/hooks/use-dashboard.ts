"use client"

import { useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import type { DashboardInsights } from "@/types"

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers) },
  })
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return (await res.json()) as T
}

export interface NetWorth {
  totalAssets: number
  totalLiabilities: number
  netWorth: number
  totalLoans: number
  totalCash: number
  breakdown: { userAssets: number; investments: number; bankBalance: number; fixedDeposits: number; cash: number }
}

export interface BankAccountSummary {
  id: number; name: string; bankName: string; balance: number; type: string; isEmergencyFund?: boolean
}

export interface CashBalance {
  amount: number; notes?: string | null
}

export interface HealthData {
  score: number
  savingsRate: number
  budgetAdherence: number | null
  spendingControl: number
  emergencyFund: number
  monthsOfCoverage: number
  totalLiquid: number
  monthlyExpense: number
}

export function insightsParams(year: string, month: string, quarter: string): string {
  const params = new URLSearchParams()
  if (year !== "all") params.set("year", year)
  if (month) params.set("month", month)
  if (quarter) params.set("quarter", quarter)
  return params.toString()
}

export function useInsights(year: string, month: string, quarter: string) {
  const params = insightsParams(year, month, quarter)
  return useQuery({
    queryKey: queryKeys.insights(params),
    queryFn: async () => {
      const data = await apiFetch<DashboardInsights>(`/api/insights?${params}`)
      if (!data || !Array.isArray(data.monthlyTrend)) throw new Error("bad insights payload")
      return data
    },
  })
}

export function useNetWorth() {
  return useQuery({
    queryKey: queryKeys.netWorth(),
    queryFn: () => apiFetch<NetWorth>("/api/net-worth"),
  })
}

export function useBankAccounts() {
  return useQuery({
    queryKey: queryKeys.bankAccounts(),
    queryFn: () => apiFetch<{ accounts: BankAccountSummary[] }>("/api/bank-accounts"),
    select: (data) => data.accounts || [],
  })
}

export function useCashBalance() {
  return useQuery({
    queryKey: queryKeys.cashBalance(),
    queryFn: () => apiFetch<{ cash: CashBalance | null }>("/api/cash-balance"),
    select: (data) => data.cash || null,
  })
}

export function useHealthScore() {
  return useQuery({
    queryKey: queryKeys.healthScore(),
    queryFn: () => apiFetch<HealthData>("/api/health-score"),
  })
}

export function useExpenseYears() {
  return useQuery({
    queryKey: queryKeys.expenseYears(),
    queryFn: () => apiFetch<{ years: number[] }>("/api/expenses/years"),
    select: (data) => (Array.isArray(data?.years) ? data.years : []),
  })
}
