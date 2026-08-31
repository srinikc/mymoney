export type AgeBucket = "early-career" | "growth" | "mid-career" | "pre-retirement" | "retirement"

export type TipCategory =
  | "budgeting"
  | "investing"
  | "savings"
  | "tax"
  | "insurance"
  | "debt"
  | "retirement"
  | "home"
  | "emergency"
  | "family"
  | "mindset"

export interface TipStep {
  title: string
  detail: string
}

export interface TipWorkflow {
  title: string
  steps: TipStep[]
  estimatedTime: string
}

export interface LearnTip {
  id: string
  title: string
  summary: string
  body: string
  category: TipCategory
  ageBuckets: AgeBucket[]
  readMinutes: number
  workflow?: TipWorkflow
  learnMoreLinks?: { label: string; href: string }[]
  ctaLabel?: string
  ctaHref?: string
}

export const AGE_BUCKET_LABEL: Record<AgeBucket, string> = {
  "early-career": "Early Career (≤25)",
  growth: "Growth (26-35)",
  "mid-career": "Mid-Career (36-50)",
  "pre-retirement": "Pre-Retirement (51-60)",
  retirement: "Retirement (61+)",
}

export const CATEGORY_LABEL: Record<TipCategory, string> = {
  budgeting: "Budgeting",
  investing: "Investing",
  savings: "Savings",
  tax: "Tax",
  insurance: "Insurance",
  debt: "Debt",
  retirement: "Retirement",
  home: "Home",
  emergency: "Emergency Fund",
  family: "Family",
  mindset: "Mindset",
}

export const CATEGORY_ICON: Record<TipCategory, string> = {
  budgeting: "wallet",
  investing: "trending-up",
  savings: "piggy-bank",
  tax: "file-text",
  insurance: "shield",
  debt: "credit-card",
  retirement: "umbrella",
  home: "home",
  emergency: "life-buoy",
  family: "users",
  mindset: "brain",
}

export const LEARN_TIPS: LearnTip[] = [
  // ── Early Career ────────────────────────────────────────────────────
  {
    id: "build-emergency-fund-first",
    title: "Build an emergency fund before anything else",
    summary: "Three to six months of expenses in a liquid fund. Non-negotiable.",
    body: "Your first financial safety net is not a SIP or a stock pick — it is cash you can reach in 24 hours. Start with ₹10K, build to one month of expenses, then three. Keep it in a high-yield savings account or overnight fund, never in equity or lock-in FDs.",
    category: "emergency",
    ageBuckets: ["early-career", "growth"],
    readMinutes: 2,
    workflow: {
      title: "How to start your emergency fund",
      estimatedTime: "1 weekend",
      steps: [
        { title: "Calculate monthly essentials", detail: "Add rent, groceries, utilities, EMIs, insurance, transport. Exclude wants." },
        { title: "Set a 3-month target", detail: "Multiply essentials by 3. That is your minimum emergency fund." },
        { title: "Open a high-yield savings account", detail: "Use a separate bank so you don't see it daily. Examples: Fi Money, Niyo, Jupiter savings." },
        { title: "Auto-debit on salary day", detail: "Set 10% of salary to auto-transfer the day after salary credits." },
        { title: "Pause all other goals until you hit 1 month", detail: "Resume SIPs and investing once the first month is funded." },
      ],
    },
    ctaLabel: "Open Emergency Fund planner",
    ctaHref: "/emergency-fund",
  },
  {
    id: "start-small-sip",
    title: "Start a ₹500 SIP this week",
    summary: "Compounding rewards time, not size. Begin now, scale later.",
    body: "A ₹500/month SIP in a Nifty 50 index fund for 30 years at 12% becomes ~₹17.5L. The same SIP started 10 years later becomes only ~₹3.5L. The biggest advantage young investors have is time, not capital.",
    category: "investing",
    ageBuckets: ["early-career"],
    readMinutes: 3,
    workflow: {
      title: "Set up your first SIP in 15 minutes",
      estimatedTime: "15 minutes",
      steps: [
        { title: "Open a free Demat account", detail: "Zerodha, Groww, or Kuvera. KYC takes 10 minutes with Aadhaar + PAN." },
        { title: "Link your bank account", detail: "Use the same account your salary hits so SIP auto-debits." },
        { title: "Search for a Nifty 50 Index Fund", detail: "UTI Nifty 50 Index Fund or HDFC Nifty 50 Index Fund. Low expense ratio (<0.20%)." },
        { title: "Set monthly SIP for the 1st or 5th", detail: "Pick a date just after salary credit. ₹500 minimum." },
        { title: "Don't watch daily", detail: "Set a calendar reminder to review every 6 months. Ignore the rest." },
      ],
    },
    ctaLabel: "Browse mutual funds",
    ctaHref: "/learn/mutual-funds",
  },
  {
    id: "avoid-lifestyle-creep",
    title: "Beware lifestyle creep",
    summary: "Every raise, save half. Spend half.",
    body: "When your salary grows 10%, your spending usually grows 8-10% to match. Within 3 years, a 50% raise has bought you zero net worth increase. The 50/50 rule on every raise: half to lifestyle, half to investments.",
    category: "mindset",
    ageBuckets: ["early-career", "growth"],
    readMinutes: 2,
    workflow: {
      title: "Apply the 50/50 raise rule",
      estimatedTime: "10 minutes",
      steps: [
        { title: "List your last 3 raises", detail: "Include bonus, promotion, and job change increments." },
        { title: "Calculate the delta", detail: "Take current CTC minus 3-years-ago CTC." },
        { title: "Compute the half", detail: "That's the minimum you should now route to investments." },
        { title: "Set up an extra SIP", detail: "Bump your existing SIP by this half-amount. Don't wait until month-end to 'see what's left'." },
      ],
    },
  },
  {
    id: "get-term-insurance-early",
    title: "Buy term insurance at 25, not 45",
    summary: "Premiums are 5–8× cheaper when you're young and healthy.",
    body: "A 25-year-old non-smoker pays ₹8,000-12,000/year for a ₹1Cr term cover for 30 years. The same cover at 45 costs ₹35,000-60,000/year, and you may be denied for pre-existing conditions. Lock in the cover now, even if dependents are hypothetical.",
    category: "insurance",
    ageBuckets: ["early-career", "growth"],
    readMinutes: 3,
    workflow: {
      title: "Buy your first term plan",
      estimatedTime: "45 minutes",
      steps: [
        { title: "Calculate cover = 10–15× annual income", detail: "Add outstanding loans to this number. Round up." },
        { title: "Compare 3 insurers on coverfox or policybazaar", detail: "HDFC Life, ICICI Pru, Max Life are reliable. Skip LIC for term (more expensive)." },
        { title: "Buy online, not through an agent", detail: "Direct online purchase is 10-15% cheaper." },
        { title: "Pay yearly, not monthly", detail: "Saves 5-8% on premium." },
        { title: "Set premium auto-debit", detail: "Mark the date. Missing a term premium can void the policy." },
      ],
    },
  },
  {
    id: "file-taxes-pan-aadhaar",
    title: "Link PAN with Aadhaar (if not done)",
    summary: "Mandatory for ITR filing. Easy ₹1,000 fine if ignored.",
    body: "Unlinked PAN becomes inoperative from April 2025. You can't file ITR, can't claim refunds, can't buy mutual funds above ₹50K. Linking takes 5 minutes on incometax.gov.in.",
    category: "tax",
    ageBuckets: ["early-career", "growth", "mid-career", "pre-retirement", "retirement"],
    readMinutes: 1,
    workflow: {
      title: "Link PAN-Aadhaar",
      estimatedTime: "5 minutes",
      steps: [
        { title: "Go to eportal.incometax.gov.in", detail: "Log in with PAN and password." },
        { title: "Navigate to Link Aadhaar", detail: "Under Profile → Link Aadhaar." },
        { title: "Enter Aadhaar and confirm", detail: "OTP goes to your Aadhaar-linked mobile." },
        { title: "Verify status", detail: "Status changes to 'Linked' within 24 hours." },
      ],
    },
  },

  // ── Growth ──────────────────────────────────────────────────────────
  {
    id: "house-rent-allowance-hra",
    title: "Maximize your HRA tax exemption",
    summary: "Save up to ₹60K/year by structuring rent payments.",
    body: "If you pay rent and receive HRA, you can claim exemption on the minimum of: (1) actual HRA received, (2) 50% of basic (metro) or 40% (non-metro), (3) rent paid minus 10% of basic. Pay rent to a parent (with their ITR showing it as income) if you live with them.",
    category: "tax",
    ageBuckets: ["growth", "mid-career"],
    readMinutes: 4,
    workflow: {
      title: "Optimize HRA exemption",
      estimatedTime: "30 minutes, annually",
      steps: [
        { title: "Get a rent receipt every month", detail: "Even if you pay via UPI, get a signed receipt on stamp paper (₹100)." },
        { title: "Check your metro status", detail: "Metro = Mumbai, Delhi, Kolkata, Chennai. Others are non-metro." },
        { title: "Pay rent to parents if applicable", detail: "They must declare it as 'House Property' income in ITR." },
        { title: "Maintain landlord PAN if rent > ₹1L/year", detail: "Mandatory. Otherwise the exemption is denied." },
        { title: "Use the HRA calculator on ClearTax or Quicko", detail: "Verify your actual exemption before declaring." },
      ],
    },
  },
  {
    id: "80c-max-out",
    title: "Max out Section 80C: ₹1.5L deduction",
    summary: "ELSS, PPF, EPF, home loan principal — pick the right mix.",
    body: "Section 80C gives ₹1.5L deduction against any income. The best instruments inside 80C: (1) ELSS mutual funds for equity exposure, 3-year lock-in, (2) PPF for safety, 15-year lock-in, (3) EPF via employer, (4) Home loan principal. NPS gets a separate ₹50K under 80CCD(1B).",
    category: "tax",
    ageBuckets: ["growth", "mid-career", "pre-retirement"],
    readMinutes: 5,
    workflow: {
      title: "Plan your 80C mix",
      estimatedTime: "1 hour annually (December)",
      steps: [
        { title: "Check what's already covered", detail: "EPF contribution from salary slip = X. Add X to your plan." },
        { title: "Calculate the gap to ₹1.5L", detail: "Gap = 1,50,000 - EPF contribution." },
        { title: "Choose ELSS if young", detail: "12% expected return vs 7% PPF. 3-year lock-in." },
        { title: "Choose PPF if conservative", detail: "15-year lock-in but sovereign guarantee." },
        { title: "Set up auto-invest in January", detail: "Don't wait until March. December has highest market volatility." },
      ],
    },
  },
  {
    id: "health-insurance-top-up",
    title: "Get a health insurance top-up, not just employer cover",
    summary: "Employer cover ends when you change jobs. Buy your own.",
    body: "A 30-year-old can get ₹10L health cover for ₹6,000-10,000/year. Add a super-top-up for ₹50L+ at ₹3,000-5,000/year. Total ₹15K/year for ₹50L+ cover. Choose a plan with no-claim-bonus and minimal co-pay.",
    category: "insurance",
    ageBuckets: ["growth", "mid-career"],
    readMinutes: 3,
    workflow: {
      title: "Buy personal health cover",
      estimatedTime: "1 hour",
      steps: [
        { title: "List your parents' ages", detail: "Floater with parents is cheaper than individual senior citizen plans." },
        { title: "Decide cover amount", detail: "₹10L base + ₹40L super top-up is the sweet spot." },
        { title: "Compare on policybazaar", detail: "HDFC Ergo, Care, Star Health, Niva Bupa are top-rated." },
        { title: "Check room rent cap", detail: "No cap or single private room is ideal. Capped plans are nightmares at claim time." },
        { title: "Set premium reminder", detail: "Insurance lapses void all waiting periods." },
      ],
    },
  },
  {
    id: "home-loan-prepay-vs-invest",
    title: "Home loan: prepay vs invest — the math",
    summary: "If loan rate > 9% and you can earn 11%+ in equity, invest. Else prepay.",
    body: "Home loan interest is non-deductible for principal pre-2024 buyers (old regime). Prepayment reduces total interest paid. Investment builds parallel corpus. Break-even rate: loan rate vs post-tax equity return. Use a prepayment calculator with your exact rate and tenure.",
    category: "debt",
    ageBuckets: ["growth", "mid-career"],
    readMinutes: 4,
    workflow: {
      title: "Decide prepay vs invest",
      estimatedTime: "1 hour annually",
      steps: [
        { title: "Get your current loan rate and outstanding", detail: "From your latest loan statement." },
        { title: "Estimate your post-tax equity return", detail: "Use 10% for Nifty 50 historical after LTCG tax." },
        { title: "If loan rate > equity return + 2%, prepay", detail: "The 2% buffer accounts for risk." },
        { title: "Split if rates are close", detail: "50% to prepayment, 50% to SIP. Reduces regret either way." },
        { title: "Avoid partial prepayment charges", detail: "Banks can't charge prepayment on floating rate loans per RBI. Verify." },
      ],
    },
  },

  // ── Mid-Career ──────────────────────────────────────────────────────
  {
    id: "kids-education-corpus",
    title: "Start the kids' education fund at birth",
    summary: "₹25L in 18 years needs just ₹4,500/month at 12%.",
    body: "Engineering today costs ₹15-25L. By 2044, that inflation-adjusted is ₹1-1.5Cr. Start a dedicated equity-only SIP the day the child is born. Use the PPF for the last 3 years before college to de-risk.",
    category: "family",
    ageBuckets: ["mid-career"],
    readMinutes: 3,
    workflow: {
      title: "Set up education fund",
      estimatedTime: "1 hour",
      steps: [
        { title: "Estimate target amount", detail: "Today's fee × 1.1^years. Round up 20%." },
        { title: "Set monthly SIP = target / 250", detail: "Rough formula; verify with SIP calculator." },
        { title: "Open a separate folio in child's name", detail: "After 18, ownership transfers cleanly." },
        { title: "Switch to debt 3 years before college", detail: "STP from equity to liquid fund." },
        { title: "Tag the goal in MyMoney", detail: "Use the Goals page so you can track progress." },
      ],
    },
    ctaLabel: "Open Goals page",
    ctaHref: "/goals",
  },
  {
    id: "nps-additional-50k",
    title: "Claim the extra ₹50K NPS deduction (80CCD-1B)",
    summary: "Above 80C. Most salaried people miss this.",
    body: "Section 80CCD(1B) gives ₹50,000 additional deduction over and above Section 80C. NPS Tier 1 account. Choose Active Life Cycle or Auto Choice fund. Equity cap is 75% until age 50, then drops.",
    category: "retirement",
    ageBuckets: ["mid-career", "pre-retirement"],
    readMinutes: 4,
    workflow: {
      title: "Open and contribute to NPS",
      estimatedTime: "30 minutes",
      steps: [
        { title: "Open a Tier 1 NPS account", detail: "eNPS portal or through your employer." },
        { title: "Choose Pension Fund Manager", detail: "HDFC, ICICI, SBI are top. Compare 5-year returns." },
        { title: "Choose Active or Auto Choice", detail: "Active if you understand the funds. Auto is hands-off." },
        { title: "Contribute ₹50K before March 31", detail: "Last-minute lump sum is fine. Don't wait." },
        { title: "Declare in ITR", detail: "Section 80CCD(1B). Form 10CCB from your NPS provider." },
      ],
    },
    ctaLabel: "Open NPS research",
    ctaHref: "/learn/nps",
  },
  {
    id: "review-mf-portfolio-annually",
    title: "Review mutual fund portfolio once a year",
    summary: "Compare against category benchmark. Drop the laggards.",
    body: "Most investors hold 8-12 funds with massive overlap. Annual review: (1) Each fund's 1Y and 3Y return vs its category average. (2) Drop bottom quartile. (3) Merge overlap. (4) Rebalance equity-debt ratio based on age.",
    category: "investing",
    ageBuckets: ["mid-career", "pre-retirement"],
    readMinutes: 4,
    workflow: {
      title: "Annual portfolio review",
      estimatedTime: "Half a day, once a year (October)",
      steps: [
        { title: "Pull consolidated portfolio", detail: "Use CAS (Consolidated Account Statement) from CAMS/Karvy." },
        { title: "Tag each fund as Core/Satellite", detail: "Core = Nifty 50, Nifty Next 50, Flexi Cap. Satellite = thematic, sectoral." },
        { title: "Compare 3Y return vs category", detail: "ValueResearchonline or Morningstar India." },
        { title: "Drop funds in bottom quartile of 3Y return", detail: "Even if they have star ratings now." },
        { title: "Rebalance to target equity-debt ratio", detail: "Equity % = 100 - age (rule of thumb) but cap at 75%." },
      ],
    },
  },

  // ── Pre-Retirement ──────────────────────────────────────────────────
  {
    id: "pay-off-loans-before-50",
    title: "Aggressively pay off all loans before 50",
    summary: "Debt-free decade = compounding decade.",
    body: "The decade 50-60 is when compounding is most powerful, but only if your salary isn't servicing EMIs. Use bonuses, salary increments, and tax refunds to prepay. Car loan, personal loan, credit card — all gone by 50. Home loan can stretch to 55.",
    category: "debt",
    ageBuckets: ["pre-retirement"],
    readMinutes: 3,
    workflow: {
      title: "Debt-free by 50 plan",
      estimatedTime: "Planning session, 2 hours",
      steps: [
        { title: "List all outstanding loans", detail: "Personal, car, credit card, home. Include interest rate and tenure." },
        { title: "Target the highest-interest first", detail: "Credit card (36-42%) > personal loan (12-16%) > car (8-10%) > home (8-9%)." },
        { title: "Allocate 30% of any bonus to prepay", detail: "Treat prepayments as non-negotiable as EMIs." },
        { title: "Avoid new debt from here", detail: "No new car loans, no new credit card balances. Buy only what cash can cover." },
        { title: "Track in MyMoney Loans", detail: "Use the Loans page to see remaining and target date." },
      ],
    },
    ctaLabel: "Open Loans page",
    ctaHref: "/loans",
  },
  {
    id: "build-retirement-corpus-25x",
    title: "Target 25× annual expenses as retirement corpus",
    summary: "The 4% safe withdrawal rule. Plan for 30 years.",
    body: "If your annual expenses are ₹6L, your retirement corpus should be ₹1.5Cr. The 4% rule means you can withdraw 4% per year and (statistically) never run out. Adjust for inflation: at 6% inflation, ₹6L becomes ₹14.4L in 15 years. So real corpus need is much higher.",
    category: "retirement",
    ageBuckets: ["pre-retirement", "mid-career"],
    readMinutes: 5,
    workflow: {
      title: "Calculate your retirement number",
      estimatedTime: "1 hour",
      steps: [
        { title: "Compute current annual expenses", detail: "Exclude EMI, kids' education (they'll be done by retirement)." },
        { title: "Multiply by 25", detail: "That's the bare-minimum corpus." },
        { title: "Adjust for inflation", detail: "If retiring in 20 years, multiply by (1.06)^20 ≈ 3.2. New target is 80× today's expenses." },
        { title: "Compare to current net worth", detail: "Add all investments minus liabilities." },
        { title: "Compute the gap and required SIP", detail: "Use a retirement calculator. MyMoney has one in /learn." },
      ],
    },
    ctaLabel: "Open Retirement calculator",
    ctaHref: "/learn/retirement",
  },
  {
    id: "shift-to-debt-glide-path",
    title: "Move to a debt glide-path in your 50s",
    summary: "Equity 100% at 25 → 50% at 50 → 30% at 60.",
    body: "Sequence-of-returns risk kills retirement plans. If the market drops 40% the year you retire, you need a debt buffer to ride it out. The 'glide path' rule: 5 years before retirement, shift 1-2% per month from equity to debt.",
    category: "retirement",
    ageBuckets: ["pre-retirement"],
    readMinutes: 4,
    workflow: {
      title: "Build your glide path",
      estimatedTime: "2 hours",
      steps: [
        { title: "Set retirement date", detail: "Pick a year. Build backwards." },
        { title: "Compute target equity % at retirement", detail: "30% if you'll have a pension, 50% if fully self-funded." },
        { title: "Compute current equity %", detail: "From portfolio statement." },
        { title: "Calculate the per-year shift", detail: "(Current% - Target%) / years-to-retirement." },
        { title: "Set up STP", detail: "Monthly Systematic Transfer from equity to debt fund, 5 years out." },
      ],
    },
  },

  // ── Retirement ───────────────────────────────────────────────────────
  {
    id: "health-insurance-critical-illness",
    title: "Critical illness cover is non-negotiable after 60",
    summary: "₹10L for cancer/heart attack treatment. ₹5K/year.",
    body: "A standard health plan covers hospitalization, but critical illness plans pay a lump sum on diagnosis. This covers the loss of income, the at-home care, the alternative treatments. Get a separate CI rider or standalone plan.",
    category: "insurance",
    ageBuckets: ["retirement", "pre-retirement"],
    readMinutes: 2,
    workflow: {
      title: "Buy critical illness cover",
      estimatedTime: "1 hour",
      steps: [
        { title: "Check if your health plan includes CI", detail: "Many don't, or cap at ₹2L. Read the policy document." },
        { title: "Buy a standalone CI plan", detail: "HDFC Life, Max Life, ICICI Pru are top-rated. ₹10L cover, ₹5-8K/year." },
        { title: "Wait 90 days for coverage to start", detail: "Standard waiting period. Plan ahead." },
        { title: "Set up auto-debit for the premium", detail: "Most lapses happen because of missed renewals." },
      ],
    },
  },
  {
    id: "will-and-nomination",
    title: "Write a will and update nominations",
    summary: "Without a will, your assets go through years of legal hassle.",
    body: "A simple will costs ₹3,000-5,000 through services like LegalDesk or Vakilsearch. It names executors, distributes assets, and saves your family 2-5 years of probate. Update nominees on all bank accounts, demat, EPF, insurance, and locker.",
    category: "family",
    ageBuckets: ["mid-career", "pre-retirement", "retirement"],
    readMinutes: 4,
    workflow: {
      title: "Estate planning checklist",
      estimatedTime: "1 week (most is waiting on stamps/signatures)",
      steps: [
        { title: "List all assets", detail: "Bank accounts, demat, mutual funds, FDs, property, gold, insurance." },
        { title: "Check nomination status on each", detail: "Most people have outdated nominees (parents) when they should be spouse." },
        { title: "Update nominations online", detail: "Banks, demat, EPF, insurance all have online nomination now." },
        { title: "Draft a simple will", detail: "Use LegalDesk, Vakilsearch, or a local lawyer. ₹5K total." },
        { title: "Register the will", detail: "Optional but recommended. ₹1,000-2,000." },
      ],
    },
  },
]

export function tipsForAge(age: number | null | undefined, limit?: number): LearnTip[] {
  if (age == null) return LEARN_TIPS.slice(0, limit ?? LEARN_TIPS.length)
  const bucket: AgeBucket =
    age <= 25 ? "early-career" :
    age <= 35 ? "growth" :
    age <= 50 ? "mid-career" :
    age <= 60 ? "pre-retirement" :
    "retirement"
  const matched = LEARN_TIPS.filter((t) => t.ageBuckets.includes(bucket))
  return limit ? matched.slice(0, limit) : matched
}

export function tipsForCategory(category: TipCategory, age?: number | null): LearnTip[] {
  const filtered = LEARN_TIPS.filter((t) => t.category === category)
  if (age == null) return filtered
  return filtered.filter((t) => t.ageBuckets.includes(
    age <= 25 ? "early-career" :
    age <= 35 ? "growth" :
    age <= 50 ? "mid-career" :
    age <= 60 ? "pre-retirement" :
    "retirement"
  ))
}

export function tipById(id: string): LearnTip | undefined {
  return LEARN_TIPS.find((t) => t.id === id)
}
