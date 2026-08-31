// SIP and lumpsum projection engine. Pure functions, no DB.

export interface SIPInput {
  monthlyAmount: number
  expectedReturnPct: number // annual, e.g. 12 for 12%
  years: number
  annualStepUpPct?: number // optional annual increase in SIP amount
}

export interface SIPResult {
  totalInvested: number
  totalCorpus: number
  totalGains: number
  absoluteReturnPct: number
  yearlyBreakdown: Array<{
    year: number
    invested: number
    corpus: number
    gains: number
  }>
}

export function calculateSIP(input: SIPInput): SIPResult {
  const { monthlyAmount, expectedReturnPct, years, annualStepUpPct = 0 } = input
  const monthlyRate = expectedReturnPct / 100 / 12
  const yearlyBreakdown: SIPResult["yearlyBreakdown"] = []
  let corpus = 0
  let totalInvested = 0
  let currentMonthly = monthlyAmount

  for (let year = 1; year <= years; year++) {
    for (let month = 1; month <= 12; month++) {
      corpus = corpus * (1 + monthlyRate) + currentMonthly
      totalInvested += currentMonthly
    }
    yearlyBreakdown.push({
      year,
      invested: Math.round(totalInvested),
      corpus: Math.round(corpus),
      gains: Math.round(corpus - totalInvested),
    })
    currentMonthly = currentMonthly * (1 + annualStepUpPct / 100)
  }

  return {
    totalInvested: Math.round(totalInvested),
    totalCorpus: Math.round(corpus),
    totalGains: Math.round(corpus - totalInvested),
    absoluteReturnPct: totalInvested > 0 ? Math.round(((corpus - totalInvested) / totalInvested) * 10000) / 100 : 0,
    yearlyBreakdown,
  }
}

export interface LumpsumInput {
  amount: number
  expectedReturnPct: number
  years: number
}

export interface LumpsumResult {
  invested: number
  corpus: number
  gains: number
  absoluteReturnPct: number
  yearlyBreakdown: Array<{
    year: number
    corpus: number
    gains: number
  }>
}

export function calculateLumpsum(input: LumpsumInput): LumpsumResult {
  const { amount, expectedReturnPct, years } = input
  const annualRate = expectedReturnPct / 100
  const yearlyBreakdown: LumpsumResult["yearlyBreakdown"] = []
  for (let year = 1; year <= years; year++) {
    const corpus = amount * Math.pow(1 + annualRate, year)
    yearlyBreakdown.push({
      year,
      corpus: Math.round(corpus),
      gains: Math.round(corpus - amount),
    })
  }
  const finalCorpus = amount * Math.pow(1 + annualRate, years)
  return {
    invested: amount,
    corpus: Math.round(finalCorpus),
    gains: Math.round(finalCorpus - amount),
    absoluteReturnPct: Math.round(((finalCorpus - amount) / amount) * 10000) / 100,
    yearlyBreakdown,
  }
}

export interface ReverseSIPInput {
  targetCorpus: number
  expectedReturnPct: number
  years: number
}

export function calculateRequiredSIP(input: ReverseSIPInput): number {
  const { targetCorpus, expectedReturnPct, years } = input
  const monthlyRate = expectedReturnPct / 100 / 12
  const months = years * 12
  if (monthlyRate === 0) return Math.ceil(targetCorpus / months)
  const futureValueAnnuity = ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate)
  return Math.ceil(targetCorpus / futureValueAnnuity)
}

// Inflation-adjusted target
export function inflationAdjustedTarget(todayAmount: number, inflationPct: number, years: number): number {
  return Math.round(todayAmount * Math.pow(1 + inflationPct / 100, years))
}

// Real return (after tax + inflation)
export function realReturn(nominalPct: number, inflationPct: number, taxPct: number = 0): number {
  const afterTax = nominalPct * (1 - taxPct / 100)
  return Math.round((afterTax - inflationPct) * 100) / 100
}

// Real corpus value (today's purchasing power)
export function realCorpus(nominalCorpus: number, inflationPct: number, years: number): number {
  return Math.round(nominalCorpus / Math.pow(1 + inflationPct / 100, years))
}
