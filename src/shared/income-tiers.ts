export type IncomeTier = "starter" | "standard" | "growth" | "high-earner" | "vhnw"

export interface IncomeTierDef {
  tier: IncomeTier
  label: string
  minIncome: number
  maxIncome: number
  split: { needs: number; wants: number; savings: number }
  rationale: string
  taxTips: string[]
  investmentTips: string[]
  pitfallsToAvoid: string[]
}

export const INCOME_TIERS: IncomeTierDef[] = [
  {
    tier: "starter",
    label: "Starter (<₹5L)",
    minIncome: 0,
    maxIncome: 500_000,
    split: { needs: 60, wants: 30, savings: 10 },
    rationale: "Income is tight. Build the savings habit with 10% — even small amounts compound over decades.",
    taxTips: [
      "Use the new tax regime (₹7L rebate makes income up to ₹7L tax-free).",
      "PPF for long-term safe equity-free compounding. ₹500/month for 15 years = ₹1.7L.",
      "Avoid tax-saving FDs — same return, worse liquidity.",
    ],
    investmentTips: [
      "One Nifty 50 index fund SIP. ₹500/month is enough to start.",
      "Avoid thematic and sectoral funds — they need experience to time.",
      "Never invest in something you don't understand.",
    ],
    pitfallsToAvoid: [
      "Lifestyle creep on first salary — wait 6 months before upgrading phone/car.",
      "Avoiding term insurance because 'nothing will happen' — premiums are 8× cheaper now.",
      "Borrowing on credit card for 'rewards' — 36-42% APR is never worth points.",
    ],
  },
  {
    tier: "standard",
    label: "Standard (₹5L–₹15L)",
    minIncome: 500_000,
    maxIncome: 1_500_000,
    split: { needs: 50, wants: 30, savings: 20 },
    rationale: "Standard 50/30/20. The classic balanced rule for the typical Indian middle class.",
    taxTips: [
      "Old regime: max out 80C (₹1.5L via ELSS + EPF), 80D (₹25K health insurance).",
      "New regime: skip 80C investments — lower slab rates beat the deduction.",
      "HRA exemption if paying rent. NPS gives extra ₹50K under 80CCD(1B).",
    ],
    investmentTips: [
      "3-fund core: Nifty 50 + Nifty Next 50 + Flexi Cap. Total 30-40% of monthly investable surplus.",
      "PPF or VPF for safe 7-8% tax-free. Target ₹5L+ balance.",
      "Review portfolio every October. Drop bottom-quartile funds.",
    ],
    pitfallsToAvoid: [
      "Lifestyle inflation matching every raise. Apply 50/50 rule on increments.",
      "Buying ULIP as 'insurance + investment'. Buy term + invest separately — way cheaper.",
      "Ignoring health insurance because 'employer covers'. Cover ends when you change jobs.",
    ],
  },
  {
    tier: "growth",
    label: "Growth (₹15L–₹30L)",
    minIncome: 1_500_000,
    maxIncome: 3_000_000,
    split: { needs: 40, wants: 30, savings: 30 },
    rationale: "Higher income means higher capacity to build wealth. Push savings to 30%.",
    taxTips: [
      "Old regime: 80C, 80CCD(1B) NPS, 80D for parents (₹50K if senior).",
      "Donate to 80G-registered NGOs for additional deduction (up to 50% of donation).",
      "LTCG on equity is tax-free up to ₹1.25L/year — use it.",
    ],
    investmentTips: [
      "Asset allocation matters more than fund selection. 60% equity / 30% debt / 10% gold.",
      "Use international funds (Nasdaq / S&P 500) for 10-15% of equity — Indian market isn't everything.",
      "Real estate via REITs — start with Embassy/Mindspace at ₹10K.",
    ],
    pitfallsToAvoid: [
      "Buying a bigger house 'because you can'. EMI eats the 30% savings you should be building.",
      "Foreign vacation loans. If you can't pay cash, you can't afford the trip.",
      "Children's 'international education' fund overshoot — set realistic targets.",
    ],
  },
  {
    tier: "high-earner",
    label: "High Earner (₹30L–₹50L)",
    minIncome: 3_000_000,
    maxIncome: 5_000_000,
    split: { needs: 35, wants: 30, savings: 35 },
    rationale: "Max tax-advantaged accounts first. Employer NPS, EPF, ELSS, PPF all add up.",
    taxTips: [
      "Old regime: 80C + 80CCD(1B) + 80CCD(2) employer NPS = ₹2L+ in deductions.",
      "Consider HUF (Hindu Undivided Family) for additional ₹2.5L basic exemption.",
      "Debt funds: use accrual taxation carefully — old regime is better for debt-heavy portfolios.",
    ],
    investmentTips: [
      "Direct stocks + index funds + PMS/AIF (if accredited) for diversification.",
      "Consider VCTF (Voluntary Contribution to Tier 1 NPS) — 60% equity allowed, tax-deductible.",
      "Tax-free bonds (NHAI/REC/PFC) for stable post-tax yield in 30% bracket.",
    ],
    pitfallsToAvoid: [
      "Concentration risk: 60% of net worth in one stock or one property.",
      "Ignoring estate planning — write a will, update nominees.",
      "Private equity / crypto FOMO without understanding. FOMO is not a strategy.",
    ],
  },
  {
    tier: "vhnw",
    label: "VHNW (>₹50L)",
    minIncome: 5_000_000,
    maxIncome: Number.MAX_SAFE_INTEGER,
    split: { needs: 30, wants: 25, savings: 45 },
    rationale: "Wealth preservation and tax efficiency dominate. Your marginal rate is 30%+ — every rupee sheltered is a rupee earned.",
    taxTips: [
      "AIF Category II for capital gains exemption (Sec 54F / lock-in).",
      "Trusts for estate and succession planning.",
      "Charitable remainder trusts for tax-efficient philanthropy.",
    ],
    investmentTips: [
      "15-20% in alternatives: AIF, venture, structured products.",
      "Global diversification is now essential — 25-30% international.",
      "Private market access via FundsIndia / iVentures / Validus.",
    ],
    pitfallsToAvoid: [
      "Lifestyle inflation at this level is the #1 wealth killer — steward class drift.",
      "Concentration in employer stock. Diversify via 10b5-1 plans.",
      "Ignoring succession planning. Estate disputes destroy wealth across generations.",
    ],
  },
]

export function tierForIncome(annualIncome: number | null | undefined): IncomeTierDef {
  if (annualIncome == null || annualIncome <= 0) return INCOME_TIERS[1] // default to standard
  return INCOME_TIERS.find((t) => annualIncome >= t.minIncome && annualIncome < t.maxIncome) ?? INCOME_TIERS[1]
}
