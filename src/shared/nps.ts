// NPS fund managers and asset allocation data. Static reference dataset.

export interface NPSFundManager {
  code: string
  name: string
  category: "public" | "private"
  ageRanges: {
    label: string
    minAge: number
    maxAge: number
    equityPct: number
    corporateDebtPct: number
    governmentSecuritiesPct: number
    alternativePct: number
  }[]
  historical3yCagr: number
  historical5yCagr: number
  sinceInceptionCagr: number
  aumCr: number
  description: string
  pros: string[]
  cons: string[]
}

export const NPS_FUND_MANAGERS: NPSFundManager[] = [
  {
    code: "SBI-PENSION",
    name: "SBI Pension Fund",
    category: "public",
    ageRanges: [
      { label: "≤35 years", minAge: 18, maxAge: 35, equityPct: 75, corporateDebtPct: 10, governmentSecuritiesPct: 10, alternativePct: 5 },
      { label: "36-45 years", minAge: 36, maxAge: 45, equityPct: 65, corporateDebtPct: 15, governmentSecuritiesPct: 15, alternativePct: 5 },
      { label: "46-55 years", minAge: 46, maxAge: 55, equityPct: 50, corporateDebtPct: 20, governmentSecuritiesPct: 25, alternativePct: 5 },
      { label: "56-60 years", minAge: 56, maxAge: 60, equityPct: 30, corporateDebtPct: 25, governmentSecuritiesPct: 40, alternativePct: 5 },
      { label: ">60 years", minAge: 61, maxAge: 75, equityPct: 15, corporateDebtPct: 25, governmentSecuritiesPct: 55, alternativePct: 5 },
    ],
    historical3yCagr: 14.5,
    historical5yCagr: 13.2,
    sinceInceptionCagr: 11.8,
    aumCr: 25000,
    description: "Government-backed pension fund. Largest AUM in NPS. Conservative equity glide path.",
    pros: ["Largest AUM in NPS", "Government backing", "Conservative default allocation", "Low expense ratio (0.07%)"],
    cons: ["Less aggressive than private funds", "Limited international exposure"],
  },
  {
    code: "HDFC-PENSION",
    name: "HDFC Pension Fund",
    category: "private",
    ageRanges: [
      { label: "≤35 years", minAge: 18, maxAge: 35, equityPct: 75, corporateDebtPct: 10, governmentSecuritiesPct: 10, alternativePct: 5 },
      { label: "36-45 years", minAge: 36, maxAge: 45, equityPct: 65, corporateDebtPct: 15, governmentSecuritiesPct: 15, alternativePct: 5 },
      { label: "46-55 years", minAge: 46, maxAge: 55, equityPct: 50, corporateDebtPct: 20, governmentSecuritiesPct: 25, alternativePct: 5 },
      { label: "56-60 years", minAge: 56, maxAge: 60, equityPct: 30, corporateDebtPct: 25, governmentSecuritiesPct: 40, alternativePct: 5 },
      { label: ">60 years", minAge: 61, maxAge: 75, equityPct: 15, corporateDebtPct: 25, governmentSecuritiesPct: 55, alternativePct: 5 },
    ],
    historical3yCagr: 15.2,
    historical5yCagr: 13.8,
    sinceInceptionCagr: 12.4,
    aumCr: 18000,
    description: "HDFC's pension arm. Strong equity returns historically. More aggressive default.",
    pros: ["Strong historical equity returns", "Active Choice option", "Low expense ratio (0.09%)", "Brand trust"],
    cons: ["Slightly higher expense than SBI", "Less government backing"],
  },
  {
    code: "ICICI-PRUDENTIAL-PENSION",
    name: "ICICI Prudential Pension Fund",
    category: "private",
    ageRanges: [
      { label: "≤35 years", minAge: 18, maxAge: 35, equityPct: 75, corporateDebtPct: 10, governmentSecuritiesPct: 10, alternativePct: 5 },
      { label: "36-45 years", minAge: 36, maxAge: 45, equityPct: 65, corporateDebtPct: 15, governmentSecuritiesPct: 15, alternativePct: 5 },
      { label: "46-55 years", minAge: 46, maxAge: 55, equityPct: 50, corporateDebtPct: 20, governmentSecuritiesPct: 25, alternativePct: 5 },
      { label: "56-60 years", minAge: 56, maxAge: 60, equityPct: 30, corporateDebtPct: 25, governmentSecuritiesPct: 40, alternativePct: 5 },
      { label: ">60 years", minAge: 61, maxAge: 75, equityPct: 15, corporateDebtPct: 25, governmentSecuritiesPct: 55, alternativePct: 5 },
    ],
    historical3yCagr: 14.8,
    historical5yCagr: 13.5,
    sinceInceptionCagr: 12.1,
    aumCr: 12000,
    description: "ICICI Prudential's pension arm. Balanced approach with active equity management.",
    pros: ["Active equity management", "Solid track record", "Good customer service"],
    cons: ["Mid-tier AUM", "Standard 0.09% expense ratio"],
  },
  {
    code: "KOTAK-PENSION",
    name: "Kotak Mahindra Pension Fund",
    category: "private",
    ageRanges: [
      { label: "≤35 years", minAge: 18, maxAge: 35, equityPct: 75, corporateDebtPct: 10, governmentSecuritiesPct: 10, alternativePct: 5 },
      { label: "36-45 years", minAge: 36, maxAge: 45, equityPct: 65, corporateDebtPct: 15, governmentSecuritiesPct: 15, alternativePct: 5 },
      { label: "46-55 years", minAge: 46, maxAge: 55, equityPct: 50, corporateDebtPct: 20, governmentSecuritiesPct: 25, alternativePct: 5 },
      { label: "56-60 years", minAge: 56, maxAge: 60, equityPct: 30, corporateDebtPct: 25, governmentSecuritiesPct: 40, alternativePct: 5 },
      { label: ">60 years", minAge: 61, maxAge: 75, equityPct: 15, corporateDebtPct: 25, governmentSecuritiesPct: 55, alternativePct: 5 },
    ],
    historical3yCagr: 15.0,
    historical5yCagr: 13.6,
    sinceInceptionCagr: 12.0,
    aumCr: 8500,
    description: "Kotak's NPS arm. Competitive returns. Smaller AUM but growing.",
    pros: ["Competitive returns", "Kotak brand reliability", "Active Choice option"],
    cons: ["Smaller AUM than SBI/HDFC", "Standard 0.09% expense ratio"],
  },
  {
    code: "LIC-PENSION",
    name: "LIC Pension Fund",
    category: "public",
    ageRanges: [
      { label: "≤35 years", minAge: 18, maxAge: 35, equityPct: 75, corporateDebtPct: 10, governmentSecuritiesPct: 10, alternativePct: 5 },
      { label: "36-45 years", minAge: 36, maxAge: 45, equityPct: 65, corporateDebtPct: 15, governmentSecuritiesPct: 15, alternativePct: 5 },
      { label: "46-55 years", minAge: 46, maxAge: 55, equityPct: 50, corporateDebtPct: 20, governmentSecuritiesPct: 25, alternativePct: 5 },
      { label: "56-60 years", minAge: 56, maxAge: 60, equityPct: 30, corporateDebtPct: 25, governmentSecuritiesPct: 40, alternativePct: 5 },
      { label: ">60 years", minAge: 61, maxAge: 75, equityPct: 15, corporateDebtPct: 25, governmentSecuritiesPct: 55, alternativePct: 5 },
    ],
    historical3yCagr: 13.8,
    historical5yCagr: 12.5,
    sinceInceptionCagr: 11.2,
    aumCr: 22000,
    description: "LIC's pension fund. Most conservative. Government of India backing.",
    pros: ["Government of India backing", "Very conservative defaults", "LIC brand trust"],
    cons: ["Lower returns than private peers", "Less active management"],
  },
  {
    code: "UTI-PENSION",
    name: "UTI Retirement Solutions Pension Fund",
    category: "private",
    ageRanges: [
      { label: "≤35 years", minAge: 18, maxAge: 35, equityPct: 75, corporateDebtPct: 10, governmentSecuritiesPct: 10, alternativePct: 5 },
      { label: "36-45 years", minAge: 36, maxAge: 45, equityPct: 65, corporateDebtPct: 15, governmentSecuritiesPct: 15, alternativePct: 5 },
      { label: "46-55 years", minAge: 46, maxAge: 55, equityPct: 50, corporateDebtPct: 20, governmentSecuritiesPct: 25, alternativePct: 5 },
      { label: "56-60 years", minAge: 56, maxAge: 60, equityPct: 30, corporateDebtPct: 25, governmentSecuritiesPct: 40, alternativePct: 5 },
      { label: ">60 years", minAge: 61, maxAge: 75, equityPct: 15, corporateDebtPct: 25, governmentSecuritiesPct: 55, alternativePct: 5 },
    ],
    historical3yCagr: 14.6,
    historical5yCagr: 13.3,
    sinceInceptionCagr: 11.9,
    aumCr: 15000,
    description: "UTI's pension arm. Solid track record. Mid-tier AUM.",
    pros: ["Solid track record", "UTI brand trust", "Reasonable expense ratio"],
    cons: ["Mid-tier AUM", "Standard features"],
  },
]

// ── Retirement Calculator (4% Rule) ────────────────────────────────

export interface RetirementInput {
  currentAge: number
  retirementAge: number
  lifeExpectancy: number
  currentMonthlyExpense: number
  currentCorpus: number
  monthlyInvestment: number
  preRetirementReturn: number // annual %
  postRetirementReturn: number // annual %
  inflation: number // annual %
  stepUpPct?: number // annual SIP step-up
}

export interface RetirementResult {
  yearsToRetirement: number
  yearsInRetirement: number
  totalInvested: number
  nominalCorpus: number
  realCorpusAtRetirement: number // today's purchasing power
  realCorpusAtLifeExpectancy: number
  monthlyIncomeAtRetirement: number // 4% safe withdrawal
  targetCorpusToday: number // 25× annual expenses (today's money)
  targetCorpusAtRetirement: number // inflation-adjusted
  isOnTrack: boolean
  surplus: number // positive = surplus, negative = shortfall
  monthlyIncomeShortfall: number
  yearByYear: Array<{
    age: number
    year: number
    corpus: number
    invested: number
    phase: "accumulation" | "retirement"
  }>
  recommendations: string[]
}

export function calculateRetirement(input: RetirementInput): RetirementResult {
  const {
    currentAge,
    retirementAge,
    lifeExpectancy,
    currentMonthlyExpense,
    currentCorpus,
    monthlyInvestment,
    preRetirementReturn,
    postRetirementReturn,
    inflation,
    stepUpPct = 10,
  } = input

  const yearsToRetirement = Math.max(0, retirementAge - currentAge)
  const yearsInRetirement = Math.max(0, lifeExpectancy - retirementAge)
  const annualExpense = currentMonthlyExpense * 12
  const targetCorpusToday = annualExpense * 25 // 4% rule
  const targetCorpusAtRetirement = targetCorpusToday * Math.pow(1 + inflation / 100, yearsToRetirement)

  // Accumulation phase
  const monthlyRate = preRetirementReturn / 100 / 12
  let corpus = currentCorpus
  let totalInvested = currentCorpus
  let currentMonthly = monthlyInvestment
  const yearByYear: RetirementResult["yearByYear"] = []
  const startYear = new Date().getFullYear()

  for (let year = 1; year <= yearsToRetirement; year++) {
    for (let month = 1; month <= 12; month++) {
      corpus = corpus * (1 + monthlyRate) + currentMonthly
      totalInvested += currentMonthly
    }
    yearByYear.push({
      age: currentAge + year,
      year: startYear + year,
      corpus: Math.round(corpus),
      invested: Math.round(totalInvested),
      phase: "accumulation",
    })
    currentMonthly = currentMonthly * (1 + stepUpPct / 100)
  }

  const nominalCorpus = corpus
  const realCorpusAtRetirement = nominalCorpus / Math.pow(1 + inflation / 100, yearsToRetirement)

  // Retirement phase — withdraw inflation-adjusted expenses
  const postMonthlyRate = postRetirementReturn / 100 / 12
  const inflationMonthlyRate = inflation / 100 / 12
  let withdrawal = annualExpense * Math.pow(1 + inflation / 100, yearsToRetirement) / 12

  for (let year = 1; year <= yearsInRetirement; year++) {
    for (let month = 1; month <= 12; month++) {
      corpus = corpus * (1 + postMonthlyRate) - withdrawal
      // Nominal withdrawal increases with inflation
      if (month === 12) {
        withdrawal = withdrawal * (1 + inflation / 100)
      }
      // Avoid going negative
      if (corpus < 0) corpus = 0
    }
    yearByYear.push({
      age: retirementAge + year,
      year: startYear + yearsToRetirement + year,
      corpus: Math.round(corpus),
      invested: Math.round(totalInvested),
      phase: "retirement",
    })
  }

  const realCorpusAtLifeExpectancy = corpus / Math.pow(1 + inflation / 100, yearsToRetirement + yearsInRetirement)
  const monthlyIncomeAtRetirement = (nominalCorpus * 0.04) / 12
  const monthlyExpenseAtRetirement = annualExpense * Math.pow(1 + inflation / 100, yearsToRetirement) / 12
  const monthlyIncomeShortfall = Math.max(0, monthlyExpenseAtRetirement - monthlyIncomeAtRetirement)
  const isOnTrack = nominalCorpus >= targetCorpusAtRetirement

  const recommendations: string[] = []
  if (!isOnTrack) {
    const gap = targetCorpusAtRetirement - nominalCorpus
    const extraSIP = gap / (yearsToRetirement * 12)
    recommendations.push(`Increase monthly SIP by ₹${Math.round(extraSIP).toLocaleString("en-IN")} to close the gap.`)
  }
  if (corpus < 0) {
    recommendations.push("Corpus depletes before life expectancy. Consider delaying retirement by 2-3 years or reducing retirement expenses.")
  }
  if (preRetirementReturn < 10) {
    recommendations.push("Pre-retirement return of " + preRetirementReturn + "% is conservative. NPS equity + index funds can deliver 11-13% over 20+ years.")
  }
  if (stepUpPct < 8) {
    recommendations.push(`Annual SIP step-up of ${stepUpPct}% is below the typical salary hike. Consider 10-12% to outpace inflation.`)
  }
  if (currentCorpus < annualExpense * 3) {
    recommendations.push("Build emergency fund of 3-6 months expenses first before aggressive retirement investing.")
  }
  if (isOnTrack && recommendations.length === 0) {
    recommendations.push("You're on track. Stay invested, avoid withdrawals, and review annually.")
  }

  return {
    yearsToRetirement,
    yearsInRetirement,
    totalInvested: Math.round(totalInvested),
    nominalCorpus: Math.round(nominalCorpus),
    realCorpusAtRetirement: Math.round(realCorpusAtRetirement),
    realCorpusAtLifeExpectancy: Math.round(realCorpusAtLifeExpectancy),
    monthlyIncomeAtRetirement: Math.round(monthlyIncomeAtRetirement),
    targetCorpusToday,
    targetCorpusAtRetirement: Math.round(targetCorpusAtRetirement),
    isOnTrack,
    surplus: Math.round(nominalCorpus - targetCorpusAtRetirement),
    monthlyIncomeShortfall: Math.round(monthlyIncomeShortfall),
    yearByYear,
    recommendations,
  }
}

// NPS-specific tax benefit
export const NPS_TAX_BENEFITS = {
  section80CCD1B: 50000, // extra ₹50K over and above 80C
  section80CCD2: "Up to 10% of basic salary (employer contribution, no upper cap)",
  partialWithdrawal: "Up to 25% of own contribution for specific needs (education, medical, housing)",
  taxFreeCorpus: "60% of corpus at retirement is tax-free. 40% must be used to buy annuity (taxable income).",
  annuity: "Min 40% must be annuitized. Annuity income is taxable as regular income.",
}
