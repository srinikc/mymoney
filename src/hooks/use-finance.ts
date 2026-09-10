"use client"

import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import { apiFetch } from "@/hooks/use-dashboard"
import type { Investment, Goal, Category, Expense } from "@/types"
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

export interface FixedDeposit {
  id: number; fdNumber?: string; principal: number; interestRate: number
  startDate?: string; maturityDate?: string; maturityAmount?: number; status: string
  bankName?: string
}

export interface BankAccount {
  id: number; name: string; bankName: string; accountNumber?: string; type: string
  ifscCode?: string; balance: number; currency: string; source: string; isActive: boolean
  fixedDeposits: FixedDeposit[]; lastSynced?: string | null
}

export function useBankAccountsData() {
  return useQuery({
    queryKey: queryKeys.bankAccounts(),
    queryFn: () => apiFetch<{ accounts: BankAccount[]; totals: { balance: number; fdValue: number } }>("/api/bank-accounts"),
    select: (d) => ({
      accounts: d.accounts || [],
      totals: d.totals || { balance: 0, fdValue: 0 },
    }),
  })
}

export interface PaginatedResponse {
  data: Expense[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  distinctPersons: string[]
  distinctRecurrenceTypes: string[]
  distinctPaymentModes: string[]
  distinctVendors: string[]
  distinctSubCategories: string[]
  distinctBankAccounts: string[]
  totalAmount: number
}

export type SortField = "date" | "amount" | "vendor" | "person" | "paymentMode" | "bankAccount"
export type SortDir = "asc" | "desc"
export type FilterMode = "contains" | "not-contains"

export interface ExpenseListParams {
  page: number
  search: string
  sessionFilter: string
  categoryFilter: string[]
  personFilter: string[]
  recurrenceFilter: string[]
  paymentModeFilter: string[]
  vendorFilter: string[]
  vendorFilterMode: FilterMode
  subCategoryFilter: string[]
  subCategoryFilterMode: FilterMode
  bankFilter: string[]
  notesFilter: string
  descriptionFilter: string
  otherTypeFilter: string
  flaggedFilter: boolean
  dateFrom: string
  dateTo: string
  amountMin: string
  amountMax: string
  sortField: SortField
  sortDir: SortDir
}

export function buildExpenseListParams(p: ExpenseListParams): string {
  const params = new URLSearchParams({
    page: String(p.page),
    pageSize: "100",
  })
  if (p.search) params.set("search", p.search)
  if (p.sessionFilter) params.set("importSessionId", p.sessionFilter)

  // Multi-select filters: send comma-separated values
  if (p.categoryFilter.length > 0) params.set("categoryIds", p.categoryFilter.join(","))
  if (p.personFilter.length > 0) params.set("persons", p.personFilter.join(","))
  if (p.recurrenceFilter.length > 0) params.set("recurrenceTypes", p.recurrenceFilter.join(","))
  if (p.paymentModeFilter.length > 0) params.set("paymentModes", p.paymentModeFilter.join(","))
  if (p.vendorFilter.length > 0) {
    params.set("vendors", p.vendorFilter.join(","))
    params.set("vendorMode", p.vendorFilterMode)
  }
  if (p.subCategoryFilter.length > 0) {
    params.set("subCategories", p.subCategoryFilter.join(","))
    params.set("subCategoryMode", p.subCategoryFilterMode)
  }
  if (p.bankFilter.length > 0) params.set("bankAccounts", p.bankFilter.join(","))
  if (p.notesFilter) params.set("notes", p.notesFilter)
  if (p.descriptionFilter) params.set("description", p.descriptionFilter)
  if (p.otherTypeFilter) params.set("otherType", p.otherTypeFilter)
  if (p.flaggedFilter) params.set("flagged", "true")

  if (p.dateFrom) params.set("dateFrom", p.dateFrom)
  if (p.dateTo) params.set("dateTo", p.dateTo)
  if (p.amountMin) params.set("amountMin", p.amountMin)
  if (p.amountMax) params.set("amountMax", p.amountMax)
  params.set("sortField", p.sortField)
  params.set("sortDir", p.sortDir)

  return params.toString()
}

export function useExpensesList(p: ExpenseListParams) {
  const params = buildExpenseListParams(p)
  return useQuery({
    queryKey: queryKeys.expenses(params),
    queryFn: () => apiFetch<PaginatedResponse>(`/api/expenses?${params}`),
    placeholderData: keepPreviousData,
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