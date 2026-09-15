import { useApiQuery } from './use-api-query'

export interface BudgetCategory {
  id: number
  name: string
  icon: string
  color: string
}

export interface BudgetRow {
  categoryId: number
  category: BudgetCategory
  subCategory: string | null
  lastMonthSpend: number
  currentBudget: number | null
  currentSpent: number
  budgetId: number | null
}

export interface BudgetOverview {
  overview: boolean
  month: number
  year: number
  income: number
  commonCategories: BudgetRow[]
  totals: {
    current: { budget: number; spent: number }
    lastMonth: { budget: number; spent: number }
  }
}

export function useBudgetOverview(month: number, year: number) {
  return useApiQuery<BudgetOverview>(['budgets-overview', month, year], '/api/budgets/overview', {
    params: { month, year },
  })
}

export function useBudgetCategoryTree() {
  return useApiQuery<{ categories: { id: number; name: string; type: string }[]; subCategories?: string[] }>(
    ['budget-category-tree'],
    '/api/categories',
    { params: { include: 'subCategories' } },
  )
}