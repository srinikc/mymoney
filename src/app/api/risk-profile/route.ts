import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

// ── SEBI-standard 10 risk profiling questions ─────────────────────────

export interface RiskQuestion {
  id: number
  question: string
  options: { label: string; score: number }[]
}

const RISK_QUESTIONS: RiskQuestion[] = [
  {
    id: 1,
    question: "What is your age group?",
    options: [
      { label: "18–30", score: 5 },
      { label: "31–45", score: 4 },
      { label: "46–60", score: 3 },
      { label: "Above 60", score: 1 },
    ],
  },
  {
    id: 2,
    question: "What is your primary source of income?",
    options: [
      { label: "Salaried — stable job", score: 3 },
      { label: "Self-employed / Business", score: 4 },
      { label: "Professional (doctor, lawyer, etc.)", score: 4 },
      { label: "Retired / Pension", score: 2 },
      { label: "Student / Dependent", score: 1 },
    ],
  },
  {
    id: 3,
    question: "What is your annual household income?",
    options: [
      { label: "Below ₹5 lakh", score: 1 },
      { label: "₹5–15 lakh", score: 2 },
      { label: "₹15–30 lakh", score: 3 },
      { label: "₹30 lakh – ₹1 crore", score: 4 },
      { label: "Above ₹1 crore", score: 5 },
    ],
  },
  {
    id: 4,
    question: "How many dependents do you have?",
    options: [
      { label: "None", score: 5 },
      { label: "One", score: 3 },
      { label: "Two", score: 2 },
      { label: "Three or more", score: 1 },
    ],
  },
  {
    id: 5,
    question: "What is the primary goal of your investments?",
    options: [
      { label: "Capital preservation / Safety", score: 1 },
      { label: "Regular income", score: 2 },
      { label: "Growth with moderate risk", score: 3 },
      { label: "Aggressive wealth creation", score: 5 },
      { label: "Speculative / Short-term gains", score: 4 },
    ],
  },
  {
    id: 6,
    question: "How would you react if your investment dropped 20% in one year?",
    options: [
      { label: "Sell everything immediately", score: 1 },
      { label: "Sell a portion to limit losses", score: 2 },
      { label: "Hold and wait for recovery", score: 3 },
      { label: "Invest more to average down", score: 4 },
      { label: "Ignore — I have a long-term view", score: 5 },
    ],
  },
  {
    id: 7,
    question: "What investment experience do you have?",
    options: [
      { label: "None — first time investor", score: 1 },
      { label: "Only fixed deposits / PPF / EPF", score: 2 },
      { label: "Mutual funds / ETFs", score: 3 },
      { label: "Direct stocks / Equity", score: 4 },
      { label: "Derivatives / Futures & Options", score: 5 },
    ],
  },
  {
    id: 8,
    question: "For how long can you keep your money invested?",
    options: [
      { label: "Less than 1 year", score: 1 },
      { label: "1–3 years", score: 2 },
      { label: "3–5 years", score: 3 },
      { label: "5–10 years", score: 4 },
      { label: "More than 10 years", score: 5 },
    ],
  },
  {
    id: 9,
    question: "What percentage of your monthly income can you save / invest?",
    options: [
      { label: "0–5%", score: 1 },
      { label: "5–15%", score: 2 },
      { label: "15–30%", score: 3 },
      { label: "30–50%", score: 4 },
      { label: "Above 50%", score: 5 },
    ],
  },
  {
    id: 10,
    question: "What is your current debt-to-income ratio (EMI / monthly income)?",
    options: [
      { label: "Above 50% — heavily indebted", score: 1 },
      { label: "30–50%", score: 2 },
      { label: "15–30%", score: 3 },
      { label: "Below 15%", score: 4 },
      { label: "No debt at all", score: 5 },
    ],
  },
]

export type RiskProfileResult = "conservative" | "moderate" | "aggressive"

interface AllocationSuggestion {
  equity: number
  debt: number
  gold: number
  cash: number
  description: string
}

const ALLOCATIONS: Record<RiskProfileResult, AllocationSuggestion> = {
  conservative: {
    equity: 20,
    debt: 55,
    gold: 10,
    cash: 15,
    description:
      "Focus on capital preservation with fixed deposits, PPF, debt mutual funds, and government bonds. Limit equity exposure to large-cap index funds.",
  },
  moderate: {
    equity: 50,
    debt: 30,
    gold: 10,
    cash: 10,
    description:
      "Balanced mix of equity (large & mid-cap) and debt funds. Consider hybrid mutual funds, balanced advantage funds, and a diversified portfolio.",
  },
  aggressive: {
    equity: 70,
    debt: 15,
    gold: 10,
    cash: 5,
    description:
      "High equity allocation across large, mid, and small-cap funds. Include international equity, sectoral/thematic funds, and direct stock picking.",
  },
}

function calculateRiskProfile(totalScore: number): RiskProfileResult {
  const maxScore = 50
  const minScore = 10
  const normalized = (totalScore - minScore) / (maxScore - minScore) // 0 to 1
  if (normalized < 0.4) return "conservative"
  if (normalized < 0.65) return "moderate"
  return "aggressive"
}

const AnswerSchema = z.object({
  answers: z
    .array(z.number().min(1).max(5))
    .length(10),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = AnswerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid answers. Must provide an array of 10 scores (1-5 each).", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const totalScore = parsed.data.answers.reduce((sum, s) => sum + s, 0)
    const profile = calculateRiskProfile(totalScore)
    const allocation = ALLOCATIONS[profile]

    const summary = profile === "conservative"
      ? "You prefer safety and capital preservation over high returns. Your portfolio should focus on low-risk instruments."
      : (profile === "moderate"
        ? "You have a balanced approach to risk and reward. A diversified portfolio with a mix of equity and debt suits you."
        : "You are comfortable with market volatility and seek high long-term returns. Your portfolio can take on higher equity exposure.")

    return NextResponse.json({
      totalScore,
      maxScore: 50,
      minScore: 10,
      profile,
      allocation,
      summary,
    })
  } catch (error) {
    console.error("Risk profile calculation error:", error)
    return NextResponse.json({ error: "Failed to calculate risk profile" }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    questions: RISK_QUESTIONS,
    maxScore: 50,
    minScore: 10,
  })
}
