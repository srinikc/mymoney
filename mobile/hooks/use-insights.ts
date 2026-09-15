import { useApiQuery } from './use-api-query'

export type InsightPeriod = 'all' | 'year' | 'quarter' | 'month'

export interface DeepInsights {
  monthlyTrend: { month: string; amount: number; count: number }[]
  categoryBreakdown: { name: string; amount: number; count: number; color: string; subCategories: { name: string; amount: number; count: number }[] }[]
  personWise: { name: string; amount: number; count: number }[]
  topMerchants: { name: string; amount: number; count: number }[]
  yearlyComparison: { year: number; amount: number; count: number }[]
  optimization: { category: string; percentage: number; total: number; monthlyAvg: number; potentialSavings: number; subCategories: { name: string; amount: number; count: number }[] }[]
  deals: { merchant: string; title: string; discount: string; validUntil: string; description: string }[]
}

export function deepInsightsParams(period: InsightPeriod, periodYear: number): Record<string, string> {
  const params: Record<string, string> = {}
  switch (period) {
    case 'year':
      params.year = String(periodYear)
      break
    case 'quarter':
      params.year = String(periodYear)
      params.quarter = String(Math.floor(new Date().getMonth() / 3) + 1)
      break
    case 'month':
      params.year = String(periodYear)
      params.month = String(new Date().getMonth() + 1)
      break
  }
  return params
}

export function useDeepInsights(period: InsightPeriod, periodYear: number) {
  const params = deepInsightsParams(period, periodYear)
  return useApiQuery<DeepInsights>(['insights-deep', period, periodYear], '/api/insights/deep', { params })
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
  return useApiQuery<{ data: YoyEntry[] }>(['insights-yoy', category], '/api/insights/yoy', {
    params: { category, years: years.join(',') },
    enabled: !!category,
  })
}