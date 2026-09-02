// ── AI Fund Scorer (Heuristic) ──────────────────────────────────────────
// Computes a 0-10 score for a mutual fund based on its NAV history.
// All metrics are deterministic — no LLM cost. Replace with LLM-based
// scoring in PR #3 if you want richer analysis.

import { computeConsistency, computeMaxDrawdown, computeRollingReturn, fetchScheme, type MfApiNav } from "@/lib/mfapi"

export interface FundScore {
  schemeCode: number
  aiScore: number // 0-10
  breakdown: {
    return3Y: number | null
    return5Y: number | null
    consistency12M: number | null
    maxDrawdown: number | null
    sharpeApprox: number | null
  }
  summary: string
  pros: string[]
  cons: string[]
}

function approxSharpe(navs: MfApiNav[], riskFreeRate = 6): number | null {
  if (navs.length < 24) return null
  // Parse dates properly (mfapi uses DD-MM-YYYY)
  const parseDate = (s: string) => {
    const [a, b, c] = s.split("-")
    if (Number(a) > 12) return new Date(Number(c), Number(b) - 1, Number(a)).getTime()
    return new Date(s).getTime()
  }
  const sorted = [...navs].sort((a, b) => parseDate(a.date) - parseDate(b.date))
  const monthly: number[] = []
  for (let i = 1; i < sorted.length; i++) {
    const prev = Number(sorted[i - 1]?.nav)
    const curr = Number(sorted[i]?.nav)
    if (prev > 0) monthly.push((curr / prev - 1) * 100)
  }
  if (monthly.length < 12) return null
  const mean = monthly.reduce((s, v) => s + v, 0) / monthly.length
  const variance = monthly.reduce((s, v) => s + (v - mean) ** 2, 0) / monthly.length
  const stdDev = Math.sqrt(variance)
  if (stdDev === 0) return null
  const annualizedReturn = mean * 12
  const annualizedStd = stdDev * Math.sqrt(12)
  return Number(((annualizedReturn - riskFreeRate) / annualizedStd).toFixed(2))
}

function buildSummary(score: number, breakdown: FundScore["breakdown"]): string {
  if (breakdown.return3Y == null) return "Insufficient history to score."
  if (score >= 8) return `Strong performer with ${breakdown.return3Y.toFixed(1)}% 3Y CAGR and ${breakdown.consistency12M?.toFixed(0) ?? "?"}% positive months.`
  if (score >= 6) return `Solid returns (${breakdown.return3Y.toFixed(1)}% 3Y CAGR) with manageable risk.`
  if (score >= 4) return `Average performance (${breakdown.return3Y.toFixed(1)}% 3Y CAGR) — review for fit.`
  return `Weak performance (${breakdown.return3Y.toFixed(1)}% 3Y CAGR) — consider alternatives.`
}

function buildProsCons(b: FundScore["breakdown"]): { pros: string[]; cons: string[] } {
  const pros: string[] = []
  const cons: string[] = []
  if (b.return3Y != null && b.return3Y > 12) pros.push(`3Y CAGR ${b.return3Y.toFixed(1)}% beats category average`)
  if (b.return5Y != null && b.return5Y > 12) pros.push(`5Y CAGR ${b.return5Y.toFixed(1)}% shows long-term consistency`)
  if (b.consistency12M != null && b.consistency12M >= 70) pros.push(`${b.consistency12M.toFixed(0)}% positive months in last year`)
  if (b.sharpeApprox != null && b.sharpeApprox >= 1) pros.push(`Sharpe ratio ${b.sharpeApprox} indicates good risk-adjusted return`)
  if (b.maxDrawdown != null && b.maxDrawdown < -30) cons.push(`Max drawdown ${b.maxDrawdown.toFixed(0)}% is significant`)
  if (b.consistency12M != null && b.consistency12M < 50) cons.push(`Only ${b.consistency12M.toFixed(0)}% positive months in last year`)
  if (b.return3Y != null && b.return3Y < 8) cons.push(`3Y CAGR ${b.return3Y.toFixed(1)}% trails typical equity benchmark`)
  if (b.sharpeApprox != null && b.sharpeApprox < 0.5) cons.push(`Low Sharpe ratio (${b.sharpeApprox}) — risk not well rewarded`)
  return { pros, cons }
}

export async function scoreFund(schemeCode: number): Promise<FundScore | null> {
  const data = await fetchScheme(schemeCode)
  if (!data || data.data.length < 24) return null

  const return3Y = computeRollingReturn(data.data, 3)
  const return5Y = computeRollingReturn(data.data, 5)
  const consistency12M = computeConsistency(data.data)
  const maxDrawdown = computeMaxDrawdown(data.data)
  const sharpeApprox = approxSharpe(data.data)

  // Weighted score
  let score = 0
  if (return3Y != null) {
    // 0% return → 0 pts, 25% return → 10 pts (capped)
    score += Math.max(0, Math.min(10, (return3Y / 25) * 10)) * 0.4
  }
  if (return5Y != null) {
    score += Math.max(0, Math.min(10, (return5Y / 25) * 10)) * 0.25
  }
  if (consistency12M != null) {
    score += (consistency12M / 100) * 10 * 0.15
  }
  if (maxDrawdown != null) {
    // -10% DD → 10 pts, -50% DD → 0 pts
    score += Math.max(0, Math.min(10, ((maxDrawdown + 50) / 40) * 10)) * 0.1
  }
  if (sharpeApprox != null) {
    score += Math.max(0, Math.min(10, sharpeApprox * 5)) * 0.1
  }

  const breakdown: FundScore["breakdown"] = { return3Y, return5Y, consistency12M, maxDrawdown, sharpeApprox }
  const { pros, cons } = buildProsCons(breakdown)
  const summary = buildSummary(score, breakdown)

  return {
    schemeCode,
    aiScore: Math.round(score * 100) / 100,
    breakdown,
    summary,
    pros,
    cons,
  }
}
