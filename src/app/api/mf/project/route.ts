import { NextResponse } from "next/server"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"
import { z } from "zod"
import {
  calculateSIP,
  calculateLumpsum,
  calculateRequiredSIP,
  inflationAdjustedTarget,
  realReturn,
  realCorpus,
} from "@/shared/sip-calculator"

const ProjectSchema = z.object({
  type: z.enum(["sip", "lumpsum", "reverse-sip"]),
  monthlyAmount: z.number().positive().optional(),
  lumpsumAmount: z.number().positive().optional(),
  targetCorpus: z.number().positive().optional(),
  expectedReturnPct: z.number().min(0).max(50),
  years: z.number().int().min(1).max(50),
  annualStepUpPct: z.number().min(0).max(100).optional().default(0),
  inflationPct: z.number().min(0).max(20).optional().default(6),
})

export async function POST(req: Request) {
  try {
    await getAuthContext()
    const body = await req.json()
    const parsed = ProjectSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 })
    }

    const { type, expectedReturnPct, years, inflationPct } = parsed.data
    const annualStepUpPct = parsed.data.annualStepUpPct ?? 0

    if (type === "sip") {
      if (!parsed.data.monthlyAmount) {
        return NextResponse.json({ error: "monthlyAmount required for sip" }, { status: 400 })
      }
      const result = calculateSIP({
        monthlyAmount: parsed.data.monthlyAmount,
        expectedReturnPct,
        years,
        annualStepUpPct,
      })
      const realValue = realCorpus(result.totalCorpus, inflationPct, years)
      const rr = realReturn(expectedReturnPct, inflationPct)
      return NextResponse.json({
        type,
        nominal: result,
        inflation: { pct: inflationPct, realValue, realReturn: rr },
        message: `Rs. ${parsed.data.monthlyAmount}/month for ${years} years at ${expectedReturnPct}% → Rs. ${result.totalCorpus.toLocaleString("en-IN")} (real value in today's money: Rs. ${realValue.toLocaleString("en-IN")}).`,
      })
    }

    if (type === "lumpsum") {
      if (!parsed.data.lumpsumAmount) {
        return NextResponse.json({ error: "lumpsumAmount required for lumpsum" }, { status: 400 })
      }
      const result = calculateLumpsum({
        amount: parsed.data.lumpsumAmount,
        expectedReturnPct,
        years,
      })
      const realValue = realCorpus(result.corpus, inflationPct, years)
      return NextResponse.json({
        type,
        nominal: result,
        inflation: { pct: inflationPct, realValue, realReturn: realReturn(expectedReturnPct, inflationPct) },
        message: `Rs. ${parsed.data.lumpsumAmount.toLocaleString("en-IN")} for ${years} years at ${expectedReturnPct}% → Rs. ${result.corpus.toLocaleString("en-IN")} (real value: Rs. ${realValue.toLocaleString("en-IN")}).`,
      })
    }

    if (type === "reverse-sip") {
      if (!parsed.data.targetCorpus) {
        return NextResponse.json({ error: "targetCorpus required for reverse-sip" }, { status: 400 })
      }
      const realTarget = inflationAdjustedTarget(parsed.data.targetCorpus, inflationPct, years)
      const requiredNominal = calculateRequiredSIP({
        targetCorpus: parsed.data.targetCorpus,
        expectedReturnPct,
        years,
      })
      const requiredReal = calculateRequiredSIP({
        targetCorpus: realTarget,
        expectedReturnPct,
        years,
      })
      return NextResponse.json({
        type,
        target: { nominal: parsed.data.targetCorpus, realToday: realTarget, years },
        required: { monthly: requiredNominal, realPower: requiredReal },
        message: `To reach Rs. ${parsed.data.targetCorpus.toLocaleString("en-IN")} in ${years} years, SIP Rs. ${requiredNominal.toLocaleString("en-IN")}/month at ${expectedReturnPct}%. Inflation-adjusted target (today's money): Rs. ${realTarget.toLocaleString("en-IN")}, requiring Rs. ${requiredReal.toLocaleString("en-IN")}/month.`,
      })
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 })
  } catch (e) {
    return handleAuthError(e)
  }
}
